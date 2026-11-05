const chatRepo = require("../repositories/chatSessionRepository");

const HUMAN_TRIGGERS = ["agent", "human", "emergency", "receptionist", "i want to talk"];

function needsHuman(text) {
  return HUMAN_TRIGGERS.some((t) => text.toLowerCase().includes(t));
}

async function handlePatientMessage(patientId, text) {
  let session = await chatRepo.findByPatientId(patientId);

  if (!session) {
    session = await chatRepo.upsertMode(patientId, "bot");
  }

  if (session.mode === "bot" && needsHuman(text)) {
    await chatRepo.upsertMode(patientId, "human");
    return { action: "handover", patientId, text };
  }

  if (session.mode === "human") {
    return {
      action: "route_to_agent",
      patientId,
      text,
      agentSocketId: session.claimedBySocketId,
    };
  }

  return { action: "bot_reply", patientId, text: "Automated: How can I help you today?" };
}

async function claimChat(patientId, socketId, agentId) {
  const claimed = await chatRepo.claimSession(patientId, socketId, agentId);
  if (!claimed) {
    return { success: false, reason: "Already claimed by another agent" };
  }
  return { success: true, patientId };
}

async function releaseAgentChats(socketId) {
  await chatRepo.releaseBySocketId(socketId);
}

module.exports = { handlePatientMessage, claimChat, releaseAgentChats };
