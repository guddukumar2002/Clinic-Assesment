const Appointment = require("../models/Appointment");

async function findByRequestId(requestId) {
  return Appointment.findOne({ requestId });
}

async function findBySlot(doctorId, slotTime) {
  return Appointment.findOne({ doctorId, slotTime });
}

async function create(data) {
  return Appointment.create(data);
}

module.exports = { findByRequestId, findBySlot, create };
