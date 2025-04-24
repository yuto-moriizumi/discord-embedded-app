import { Server as SocketIOServer, Socket } from "socket.io";
import { EventsMap, User } from "shared"; // Userをインポート
import {
  getRoomCount,
  incrementRoomCount,
  addUserToRoom, // 追加
  removeUserFromRoom, // 追加
  getRoomUsers, // 追加
} from "./state";

export function setupSocketHandlers(io: SocketIOServer<EventsMap>) {
  io.on("connection", (socket: Socket<EventsMap, EventsMap>) => {
    console.log(`Client connected: ${socket.id}`);
    let currentRoomId: string | null = null;
    let currentUserId: string | null = null; // userIdを保持する変数

    // joinRoomイベントハンドラーを更新してuserIdとuserNameを受け取る
    socket.on(
      "joinRoom",
      (roomId: string, userId: string, userName: string) => {
        if (!roomId || !userId || !userName) {
          console.error("joinRoom event received with missing parameters:", {
            roomId,
            userId,
            userName,
          });
          return; // 必須パラメータが欠けている場合は処理しない
        }
        console.log("joinRoom event received:", {
          roomId,
          userId,
          userName,
        });

        // 以前のルームから退出
        if (currentRoomId && currentRoomId !== roomId) {
          // 以前のルームからユーザーを削除
          if (currentUserId) {
            removeUserFromRoom(currentRoomId, currentUserId);
            const oldRoomUsers = getRoomUsers(currentRoomId);
            io.to(currentRoomId).emit("updateUsers", oldRoomUsers);
            console.log(
              `User ${currentUserId} removed from room ${currentRoomId}`
            );
          }
          socket.leave(currentRoomId);
          console.log(`Socket ${socket.id} left room ${currentRoomId}`);
        }

        // 新しいルームに参加
        if (currentRoomId !== roomId) {
          socket.join(roomId);
          currentRoomId = roomId;
          currentUserId = userId; // userIdを更新
          console.log(
            `Socket ${socket.id} (User: ${userId}) joined room ${roomId}`
          );
        } else if (currentUserId !== userId) {
          // 同じルームだがユーザーIDが変わった場合（再接続など）
          // 古いIDで登録されていれば削除
          if (currentUserId) {
            removeUserFromRoom(roomId, currentUserId);
          }
          currentUserId = userId; // 新しいuserIdをセット
          console.log(
            `Socket ${socket.id} re-identified as User: ${userId} in room ${roomId}`
          );
        }

        // ユーザーをルームに追加し、更新されたリストを取得
        // Userオブジェクトのidにはクライアントから送られてきたuserIdを使用
        const newUser: User = { id: userId, name: userName };
        addUserToRoom(roomId, newUser);
        const updatedUsers = getRoomUsers(roomId);

        // ルーム内の全クライアントに更新されたユーザーリストを送信
        io.to(roomId).emit("updateUsers", updatedUsers);

        // 接続してきたクライアントに現在のカウントを送信
        const currentCount = getRoomCount(roomId);
        socket.emit("updateCount", currentCount);
      }
    );

    socket.on("incrementCount", () => {
      if (!currentRoomId) {
        console.log(
          `Socket ${socket.id} tried to increment count without joining a room.`
        );
        return; // ルームに参加していない場合は何もしない
      }

      const newCount = incrementRoomCount(currentRoomId);
      io.to(currentRoomId).emit("updateCount", newCount);
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id} (User: ${currentUserId})`);
      if (currentRoomId && currentUserId) {
        // ユーザーをルームから削除し、更新されたリストを取得
        // socket.idではなく、保持しているuserIdを使用
        removeUserFromRoom(currentRoomId, currentUserId);
        const updatedUsers = getRoomUsers(currentRoomId);

        // ルーム内の残りのクライアントにユーザーリストを送信
        io.to(currentRoomId).emit("updateUsers", updatedUsers);
        console.log(`User ${currentUserId} removed from room ${currentRoomId}`);
      }
      currentRoomId = null;
      currentUserId = null; // userIdもクリア
    });
  });
}
