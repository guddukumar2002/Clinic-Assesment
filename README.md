# Clinic Assessment

Full-stack clinic management system built with Node.js, Express, React, and Socket.IO.

Covers real-time patient–agent chat with bot handover, idempotent appointment booking, and optimistic UI.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, Socket.IO, Mongoose |
| Frontend | React 18, Vite, socket.io-client |
| Database | MongoDB |

---

## Project Structure

```
clinic-assessment/
├── backend/
│   ├── config/          # MongoDB connection
│   ├── controllers/     # Route handlers
│   ├── models/          # Mongoose schemas
│   ├── repositories/    # DB query layer
│   ├── routes/          # Express routers
│   ├── services/        # Business logic
│   ├── sockets/         # Socket.IO event handlers
│   ├── .env.example     # Environment variable template
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── ChatWindow.jsx   # Problem 3 implementation
│   │   └── main.jsx
│   └── vite.config.js
├── SOLUTION.md          # Written answers for all 4 problems
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB running locally on port `27017`

### Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd clinic-assessment

# 2. Configure backend environment
cp backend/.env.example backend/.env
# Edit backend/.env if your MongoDB URI differs

# 3. Install all dependencies and run both servers
npm install
npm run dev
```

- Backend → http://localhost:4000
- Frontend → http://localhost:3000

### Run Individually

```bash
# Backend only
cd backend
npm install
npm start

# Frontend only
cd frontend
npm install
npm run dev
```

---

## API Reference

### POST /api/appointments/book

Books a doctor appointment slot with idempotency and race condition protection.

**URL:** `http://localhost:4000/api/appointments/book`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "requestId": "req_abc123",
  "patientPhone": "+19876543210",
  "doctorId": "doc_101",
  "slotTime": "2026-10-25T10:00:00Z"
}
```

**Response Codes:**

| Status | Meaning |
|--------|---------|
| 201 | Appointment booked successfully |
| 200 | Duplicate `requestId` — returns existing booking (idempotent) |
| 409 | Slot already taken by another patient |
| 400 | Missing required fields |

**201 Response Example:**
```json
{
  "requestId": "req_abc123",
  "patientPhone": "+19876543210",
  "doctorId": "doc_101",
  "slotTime": "2026-10-25T10:00:00Z",
  "status": "confirmed",
  "_id": "...",
  "bookedAt": "2026-10-25T08:00:00.000Z"
}
```

---

### Socket.IO (ws://localhost:4000)

#### Events to Emit (Client → Server)

| Event | Payload | Description |
|---|---|---|
| `patient_message` | `{ patientId, text }` | Patient sends a message |
| `agent_claim` | `{ agentId, patientId }` | Receptionist claims a handover chat |
| `agent_message` | `{ patientId, text, tempId }` | Receptionist sends a message to patient |

#### Events to Listen (Server → Client)

| Event | Payload | Description |
|---|---|---|
| `bot_reply` | `{ patientId, text }` | Automated bot reply to patient |
| `handover_request` | `{ patientId, text }` | Patient needs a human agent — broadcast to all dashboards |
| `patient_message_routed` | `{ patientId, text, msgId }` | Patient message forwarded to the claiming agent |
| `claim_accepted` | `{ patientId }` | Agent successfully claimed the chat |
| `claim_rejected` | `{ patientId, reason }` | Chat already claimed by another agent |
| `message_confirmed` | `{ tempId }` | Server confirmed agent message delivery |
| `message_to_patient` | `{ patientId, text }` | Agent message broadcast to patient |

---

## Problems Solved

See [SOLUTION.md](./SOLUTION.md) for full written explanations of all four problems.

| # | Problem | Approach |
|---|---|---|
| 1 | Doctor slot booking race condition | Idempotency key (`requestId`) + slot uniqueness check |
| 2 | Live agent handover & bot silencing | `mode` flag in MongoDB + atomic `findOneAndUpdate` claim |
| 3 | Duplicate messages & memory leak in React | `useEffect` cleanup + `seenIds` Set + optimistic UI |
| 4 | 200,000 notification broadcast timeout | Async queue (SQS/BullMQ) + batch workers + per-patient log |
