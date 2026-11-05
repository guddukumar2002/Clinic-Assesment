import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export default function ChatWindow({ patientId, agentId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const socketRef = useRef(null);
  const seenIds = useRef(new Set());

  useEffect(() => {
    const socket = io("http://localhost:4000");
    socketRef.current = socket;

    socket.on("patient_message_routed", ({ patientId: pid, text, msgId }) => {
      if (pid !== patientId) return;
      if (seenIds.current.has(msgId)) return;
      seenIds.current.add(msgId);
      setMessages((prev) => [...prev, { id: msgId, from: "patient", text, status: "received" }]);
    });

    socket.on("message_confirmed", ({ tempId }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "sent" } : m))
      );
    });

    return () => {
      socket.off("patient_message_routed");
      socket.off("message_confirmed");
      socket.disconnect();
    };
  }, [patientId]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;

    const tempId = `temp_${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: tempId, from: "agent", text, status: "sending" },
    ]);

    socketRef.current.emit("agent_message", { patientId, text, tempId }, () => {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "sent" } : m))
      );
    });

    setInput("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              textAlign: msg.from === "agent" ? "right" : "left",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                display: "inline-block",
                background: msg.from === "agent" ? "#0078d4" : "#e5e5ea",
                color: msg.from === "agent" ? "#fff" : "#000",
                borderRadius: 12,
                padding: "6px 12px",
              }}
            >
              {msg.text}
            </span>
            {msg.from === "agent" && (
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                {msg.status === "sending" ? "Sending..." : "Sent"}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", padding: 8, borderTop: "1px solid #ddd" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          style={{ flex: 1, padding: "8px 12px", borderRadius: 20, border: "1px solid #ccc" }}
        />
        <button
          onClick={sendMessage}
          style={{ marginLeft: 8, padding: "8px 16px", borderRadius: 20, background: "#0078d4", color: "#fff", border: "none", cursor: "pointer" }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
