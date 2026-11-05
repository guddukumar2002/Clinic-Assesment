# SOLUTION.md

---

## Problem 1 — Doctor Slot Booking (Race Condition)

### Root Cause

When a patient taps "Confirm" multiple times on a slow connection, each tap fires a separate HTTP request. Because these requests arrive within milliseconds of each other, none of them sees the other's booking in the database yet — so all of them pass the "is this slot free?" check and each one writes a new appointment record. The same race condition happens when two different patients hit the same slot simultaneously.

### Strategy

Two separate guards are used. First, every request carries a client-generated `requestId` — the server checks if that ID already exists in the database and returns the cached result immediately without touching the slot table, killing duplicate submissions from the same patient. Second, the slot (`doctorId + slotTime`) is checked before writing — the first writer wins and every concurrent attempt on the same slot gets a 409. In production both guards would live in Redis so they survive server restarts and scale across multiple instances.

### Implementation Notes

- `findByRequestId` — looks up `requestId` in the `Appointment` collection; if found, returns the existing record with HTTP 200 (idempotent).
- `findBySlot` — queries `{ doctorId, slotTime }`; if taken, returns HTTP 409 with a clear error message.
- In a production system the slot check and write would be wrapped in a MongoDB transaction or a Redis `SET NX` to make the check-then-write atomic.

---

## Problem 2 — Live Agent Handover

### Tracking Bot vs Human Mode

Each patient conversation has a `mode` field stored in MongoDB (`ChatSession` model) that starts as `"bot"`. When an incoming message contains a human-trigger keyword (`"agent"`, `"human"`, `"emergency"`, `"receptionist"`, `"i want to talk"`), the server flips `mode` to `"human"` and broadcasts a `handover_request` event to all connected receptionist dashboards. Every subsequent message routing check reads this flag first — if `mode` is `"human"`, the bot code path is never reached, completely silencing automated replies.

### Guaranteeing Only One Receptionist Claims a Chat

The `claimedBySocketId` field in `ChatSession` stores which socket currently owns the chat (defaults to `null`). When a receptionist emits `agent_claim`, the server runs a MongoDB `findOneAndUpdate` with the filter `{ patientId, claimedBySocketId: null }`. MongoDB's atomic update means only one concurrent write can match that filter — the winner gets `claim_accepted`, every other receptionist gets `claim_rejected`. On disconnect, `releaseBySocketId` clears the field so another receptionist can pick up the chat.

### Implementation Notes

- `needsHuman()` — scans message text for trigger keywords using `String.includes`.
- Once in human mode, `patient_message` events are forwarded exclusively to `session.claimedBySocketId` via `io.to(socketId).emit(...)`.
- If no agent has claimed the chat yet, the message is re-broadcast as `handover_request` so dashboards keep alerting.

---

## Problem 3 — Front-Desk Chat Screen (Duplicate Messages & Memory Leak)

### Why Duplicates Appear and Why the Browser Slows Down

When WiFi drops and Socket.IO reconnects, the `useEffect` that registers `socket.on(...)` listeners runs again. If the previous listeners were never removed, the same event now has two handlers attached — every incoming message fires both, pushing the same message into React state twice. After an hour of reconnections the listener count keeps growing, each event triggers more handler calls, and React re-renders on every one, which is why the tab becomes sluggish.

### Fix

The `useEffect` cleanup function calls `socket.off(eventName)` for every registered listener and `socket.disconnect()` before the effect re-runs. This tears down the old connection cleanly before a new one is created. A `seenIds` ref (`Set`) acts as a second line of defence — even if a duplicate message slips through, the component checks the message ID before adding it to state and silently drops it.

### Optimistic UI

When the agent clicks Send, a message with `status: "sending"` is pushed into state immediately so the agent sees it on screen right away with a "Sending..." label. The `emit` acknowledgement callback (and the `message_confirmed` server event) then updates that message's status to `"sent"`. The UI never appears frozen, removing the temptation to click Send multiple times.

---

## Problem 4 — 200,000 Notification Broadcast (System Design)

### The Diagnosis

The API endpoint processed all 200,000 notifications synchronously inside the request handler — it looped through every patient record, called the external messaging provider for each one, and waited for each response before moving to the next. The HTTP connection stayed open the entire time. After 60 seconds the load balancer hit its timeout limit and killed the connection. Meanwhile the server was burning CPU and memory on that single loop, starving every other incoming request of resources.

### The Architecture

- **Decouple the trigger from the work.** The API endpoint does one thing only: validates the request, writes a campaign job to the database with status `pending`, pushes a message onto a queue (SQS / BullMQ / RabbitMQ), and immediately returns `202 Accepted` with a `campaignId`. The client gets a response in under a second regardless of patient count.

- **Dedicated worker processes consume the queue.** One or more background workers pull jobs off the queue and handle the actual sending. They run completely separately from the web server, so a slow send loop never touches the API handling bookings and live chats.

- **Process in small batches with per-patient status tracking.** Each worker processes ~500 patient records at a time. After each successful send it writes a `delivered` record to a `notification_log` table (`campaignId`, `patientId`, `status`, `sentAt`). If a batch fails partway through, only patients without a log entry need to be retried.

- **Idempotent retry with a dead-letter queue.** If a worker crashes mid-batch, the queue message becomes visible again and another worker picks it up. Re-processing skips patients that already have a `delivered` record. Messages that fail repeatedly are moved to a dead-letter queue for manual inspection.

- **Progress visibility for the hospital admin.** A `GET /api/campaigns/:id/status` endpoint queries the `notification_log` table and returns live counts: total, delivered, failed, pending. The admin dashboard can poll this endpoint or receive a WebSocket push when the campaign completes.
