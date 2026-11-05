const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  patientPhone: { type: String, required: true },
  doctorId: { type: String, required: true },
  slotTime: { type: String, required: true },
  status: { type: String, default: "confirmed" },
  bookedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Appointment", appointmentSchema);
