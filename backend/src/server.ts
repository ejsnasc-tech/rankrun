import http from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app";

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.on("join:event", (eventId: string) => {
    socket.join(`event_${eventId}`);
  });
});

app.set("io", io);

const port = Number(process.env.PORT || 3000);
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend running on port ${port}`);
});
