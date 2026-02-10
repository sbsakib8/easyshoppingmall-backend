import app from "./index";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.connect";

const PORT = process.env.PORT || 5003;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000",
      "https://easyshoppingmallbd.com",
      "https://easyshoppingmallbd.vercel.app"],
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

//  Database connection and Server start
async function startServer() {
  try {
    // 1. First, wait for database to be ready
    await connectDB();

    // 2. Then, start the server
    server.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

export { io };
