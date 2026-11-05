const chatService = require("../services/chatService");

function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("patient_message", async ({ patientId, text }) => {
      const result = await chatService.handlePatientMessage(patientId, text);

      if (result.action === "handover") {
        io.emit("handover_request", { patientId, text });
        return;
      }

      if (result.action === "route_to_agent") {
        const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        if (result.agentSocketId) {
          io.to(result.agentSocketId).emit("patient_message_routed", { patientId, text, msgId });
        } else {
          io.emit("handover_request", { patientId, text });
        }
        return;
      }

      socket.emit("bot_reply", { patientId, text: result.text });
    });

    socket.on("agent_claim", async ({ agentId, patientId }) => {
      const result = await chatService.claimChat(patientId, socket.id, agentId);

      if (!result.success) {
        socket.emit("claim_rejected", { patientId, reason: result.reason });
        return;
      }

      socket.emit("claim_accepted", { patientId });
      io.emit("chat_claimed", { patientId, agentId });
    });

    socket.on("agent_message", ({ patientId, text, tempId }) => {
      io.emit("message_to_patient", { patientId, text });
      socket.emit("message_confirmed", { tempId });
    });

    socket.on("disconnect", async () => {
      await chatService.releaseAgentChats(socket.id);
    });
  });
}

module.exports = registerSocketHandlers;
