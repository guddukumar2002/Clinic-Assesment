const appointmentRepo = require("../repositories/appointmentRepository");

async function bookAppointment({ requestId, patientPhone, doctorId, slotTime }) {
  const existing = await appointmentRepo.findByRequestId(requestId);
  if (existing) {
    return { status: 200, data: existing };
  }

  const slotTaken = await appointmentRepo.findBySlot(doctorId, slotTime);
  if (slotTaken) {
    return { status: 409, data: { error: "Slot already booked by another patient" } };
  }

  const booking = await appointmentRepo.create({
    requestId,
    patientPhone,
    doctorId,
    slotTime,
    status: "confirmed",
  });

  return { status: 201, data: booking };
}

module.exports = { bookAppointment };
