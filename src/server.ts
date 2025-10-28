import app from "./index";
import http from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://easyshopingmall-b14r.vercel.app/"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

//  Socket.io 
app.set("io", io);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });

  socket.on("subscribe", (room) => {
    socket.join(room);
  });
});

//  Server start
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

export { io };
