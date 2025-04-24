import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { EventsMap, User } from "shared";
import { setupDiscordSdk } from "./setupDiscordSdk";
import { baseUrl } from "./getBaseUrl";
import { patchUrlMappings } from "@discord/embedded-app-sdk";

/**
 * DiscordのActivityとして開かれているかどうかを判定する関数。
 * 判別処理は new DiscordSDK() の内部実装から引っ張ってきた。
 */
function isDiscordClient() {
  return !!new URLSearchParams(window.location.search).get("frame_id");
}

// Discord SDKから接続情報を取得する関数
async function getConnectionInfo() {
  if (!isDiscordClient()) {
    // Discord外の場合、仮の情報を返す
    const randomId = Math.random().toString(36).substring(2, 10);
    return {
      roomId: `web`,
      userId: `user-${randomId}`,
      userName: `User-${randomId}`,
    };
  }

  /**
   * DiscordクライアントはAPIと直接通信できないため、自分のオリジンの/apiルートにリクエストを転送する
   * 開発環境ではViteのproxyが、本番環境ではDiscordのproxyが動作する
   */
  const target = new URL(baseUrl).host;
  console.log("Patching URL mappings for Discord client", target);
  patchUrlMappings([{ target, prefix: "/api" }]);

  const { discordSdk, auth } = await setupDiscordSdk();

  // Room ID (Channel ID) を取得
  const roomId = discordSdk.channelId;
  if (roomId === null) {
    console.error("channelId is null");
    throw new Error("channelId is null");
  }

  // User情報を取得
  const user = auth.user;
  if (!user || !user.id || !(user.username || user.global_name)) {
    console.error("Failed to get user info from Discord SDK auth object", auth);
    throw new Error("Failed to get user info from Discord SDK auth object");
  }
  const userName = user.global_name ?? user.username;
  const userId = user.id;

  return { roomId, userId, userName };
}

function setupSocketIO(
  connectionInfo: { roomId: string; userId: string; userName: string },
  setCount: React.Dispatch<React.SetStateAction<number>>,
  setUsers: React.Dispatch<React.SetStateAction<User[]>>
) {
  const { roomId, userId, userName } = connectionInfo;

  const socket: Socket<EventsMap> = io(baseUrl, { path: "/socketio" });

  socket.on("connect", () => {
    // connectionInfoから取り出した値を使用
    console.log(`Emitting joinRoom: ${roomId}, ${userId}, ${userName}`);
    socket.emit("joinRoom", roomId, userId, userName);
  });

  socket.on("updateCount", (newCount: number) => {
    setCount(newCount);
  });

  // ユーザーリスト更新イベントをリッスン
  socket.on("updateUsers", (users: User[]) => {
    setUsers(users);
  });

  return socket;
}

interface ConnectionInfo {
  roomId: string;
  userId: string;
  userName: string;
}

function App() {
  const [count, setCount] = useState(0);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>();
  const [users, setUsers] = useState<User[]>([]);
  const socketRef = useRef<Socket<EventsMap> | null>(null);

  // Discord SDK認証、接続情報取得
  useEffect(() => {
    getConnectionInfo().then(setConnectionInfo);
  }, []);

  // Socket.IO接続
  useEffect(() => {
    if (!connectionInfo) return;
    socketRef.current = setupSocketIO(connectionInfo, setCount, setUsers);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connectionInfo]);

  const handleIncrement = () => {
    if (socketRef.current) socketRef.current.emit("incrementCount");
  };

  return (
    <div className="container">
      <h1>Counter App</h1>
      <p>Room ID: {connectionInfo?.roomId ?? "Loading..."}</p>{" "}
      {/* connectionInfoからroomIdを表示 */}
      <h2>Users in Room:</h2>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            ID:{user.id} Name:{user.name}
          </li> // ユーザーリストを表示
        ))}
      </ul>
      <span id="count">{count}</span>
      <button id="incrementButton" onClick={handleIncrement}>
        Increment
      </button>
    </div>
  );
}

export default App;
