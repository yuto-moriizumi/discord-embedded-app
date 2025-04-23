import { Server as SocketIOServer, Socket } from "socket.io";
import { EventsMap } from "../../shared/events";
import { getRoomCount, incrementRoomCount } from "./state";

export function setupSocketHandlers(io: SocketIOServer<EventsMap>) {
  io.on("connection", (socket: Socket<EventsMap, EventsMap>) => {
    console.log(`Client connected: ${socket.id}`);
    let currentRoomId: string | null = null;

    socket.on("joinRoom", (roomId: string) => {
      if (!roomId) return;

      if (currentRoomId && currentRoomId !== roomId) {
        socket.leave(currentRoomId);
        console.log(`Socket ${socket.id} left room ${currentRoomId}`);
      }

      if (currentRoomId !== roomId) {
        socket.join(roomId);
        currentRoomId = roomId;
        console.log(`Socket ${socket.id} joined room ${roomId}`);
      }

      const currentCount = getRoomCount(roomId);
      socket.emit("updateCount", currentCount);
    });

    socket.on("incrementCount", () => {
      if (!currentRoomId) {
        console.log(
          `Socket ${socket.id} tried to increment count without joining a room.`
        );
        return; // ルームに参加していない場合は何もしない
      }

      const newCount = incrementRoomCount(currentRoomId);
      io.to(currentRoomId).emit("updateCount", newCount);
      console.log(
        `Room ${currentRoomId} count incremented to ${newCount} by ${socket.id}`
      );
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
      currentRoomId = null; // ルーム情報をクリア (再接続時に再度joinRoomが必要)
    });
  });
}
