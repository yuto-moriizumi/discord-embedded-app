import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { EventsMap, User } from "../../shared/events";
import { setupDiscordSdk } from "./setupDiscordSdk";

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
    return { roomId: "web", userId: "webUser", userName: "Web User" };
  }

  // Discordクライアント内の場合、SDKをセットアップ
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

// setupSocketIO関数がconnectionInfoオブジェクトを受け取るように変更
function setupSocketIO(
  connectionInfo: { roomId: string; userId: string; userName: string },
  setCount: React.Dispatch<React.SetStateAction<number>>,
  setUsers: React.Dispatch<React.SetStateAction<User[]>>
) {
  const { roomId, userId, userName } = connectionInfo; // 分割代入で取り出す
  const socket: Socket<EventsMap> = io({
    path: "/api/socketio",
    // 必要であれば認証情報などをqueryで渡すことも検討
    // query: { userId, userName }
  });

  socket.on("connect", () => {
    // connectionInfoから取り出した値を使用
    console.log(`Emitting joinRoom: ${roomId}, ${userId}, ${userName}`);
    socket.emit("joinRoom", roomId, userId, userName);
  });

  socket.on("updateCount", (newCount) => {
    setCount(newCount);
  });

  // ユーザーリスト更新イベントをリッスン
  socket.on("updateUsers", (users) => {
    setUsers(users);
  });

  return socket;
}

// getRoomId 関数は getConnectionInfo に統合されたため削除

function App() {
  const [count, setCount] = useState(0);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const socketRef = useRef<Socket<EventsMap> | null>(null);

  // Discord SDK認証、接続情報取得、Socket.IO接続
  useEffect(() => {
    (async () => {
      try {
        // 接続情報を取得 (roomId, userId, userName を含む)
        const connectionInfo = await getConnectionInfo();
        setRoomId(connectionInfo.roomId);

        socketRef.current = setupSocketIO(connectionInfo, setCount, setUsers);
      } catch (error) {
        console.error("Initialization failed:", error);
        // エラーハンドリング: 必要に応じてユーザーに通知など
      }
    })();

    return () => {
      // コンポーネントのアンマウント時にソケットを切断
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const handleIncrement = () => {
    if (socketRef.current) socketRef.current.emit("incrementCount");
  };

  return (
    <div className="container">
      <h1>Counter App</h1>
      <p>Room ID: {roomId ?? "Loading..."}</p> {/* roomIdを表示 */}
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
