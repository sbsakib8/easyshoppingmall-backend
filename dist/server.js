"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const index_1 = __importDefault(require("./index"));
const PORT = process.env.PORT || 5001;
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const db_connect_1 = __importDefault(require("./config/db.connect"));
const server = http_1.default.createServer(index_1.default);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: ["http://localhost:3000",
            "https://easyshoppingmallbd.com",
            "https://easyshoppingmallbd.vercel.app"],
        methods: ["GET", "POST"],
        credentials: true,
    },
});
exports.io = io;
//  Socket.io 
index_1.default.set("io", io);
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
server.listen(PORT, async () => {
    // mongodb 
    await (0, db_connect_1.default)();
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
