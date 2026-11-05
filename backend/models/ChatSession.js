const mongoose = require("mongoose");

const chatSessionSchema = new mongoose.Schema({
  patientId: { type: String, required: true, unique: true },
  mode: { type: String, enum: ["bot", "human"], default: "bot" },
  claimedBySocketId: { type: String, default: null },
  claimedByAgentId: { type: String, default: null },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ChatSession", chatSessionSchema);
