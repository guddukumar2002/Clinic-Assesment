const ChatSession = require("../models/ChatSession");

async function findByPatientId(patientId) {
  return ChatSession.findOne({ patientId });
}

async function upsertMode(patientId, mode) {
  return ChatSession.findOneAndUpdate(
    { patientId },
    { mode, updatedAt: new Date() },
    { upsert: true, new: true }
  );
}

async function claimSession(patientId, socketId, agentId) {
  return ChatSession.findOneAndUpdate(
    { patientId, claimedBySocketId: null },
    { claimedBySocketId: socketId, claimedByAgentId: agentId, updatedAt: new Date() },
    { new: true }
  );
}

async function releaseBySocketId(socketId) {
  return ChatSession.updateMany(
    { claimedBySocketId: socketId },
    { claimedBySocketId: null, claimedByAgentId: null, updatedAt: new Date() }
  );
}

module.exports = { findByPatientId, upsertMode, claimSession, releaseBySocketId };
