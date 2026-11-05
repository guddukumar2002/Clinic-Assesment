const appointmentService = require("../services/appointmentService");

async function bookAppointment(req, res) {
  const { requestId, patientPhone, doctorId, slotTime } = req.body;

  if (!requestId || !patientPhone || !doctorId || !slotTime) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const result = await appointmentService.bookAppointment({ requestId, patientPhone, doctorId, slotTime });
  return res.status(result.status).json(result.data);
}

module.exports = { bookAppointment };
