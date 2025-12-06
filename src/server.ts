import app from "./index";
const PORT = process.env.PORT || 5001;
import http from "http";
import { Server } from "socket.io";


const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000",
    "https://easyshoppingmallbd.com",
    "https://easyshoppingmallbd.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
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
