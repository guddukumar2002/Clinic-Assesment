require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const appointmentRoutes = require("./routes/appointmentRoutes");
const registerSocketHandlers = require("./sockets/chatSocket");

const app = express();
app.use(express.json());

app.use("/api/appointments", appointmentRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

registerSocketHandlers(io);

const PORT = process.env.PORT || 4000;

connectDB().then(() => {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
