import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { EventsMap } from "../../shared/events";
import { setupDiscordSdk } from "./setupDiscordSdk";

/**
 * DiscordのActivityとして開かれているかどうかを判定する関数。
 * 判別処理は new DiscordSDK() の内部実装から引っ張ってきた。
 */
function isDiscordClient() {
  return !!new URLSearchParams(window.location.search).get("frame_id");
}

function setupSocketIO(
  roomId: string,
  setCount: React.Dispatch<React.SetStateAction<number>>
) {
  const socket: Socket<EventsMap> = io({
    path: "/api/socketio",
  });

  socket.on("connect", () => {
    socket.emit("joinRoom", roomId);
  });

  socket.on("updateCount", (newCount) => {
    setCount(newCount);
  });

  return socket;
}

async function getRoomId() {
  if (!isDiscordClient()) return "web";
  const { discordSdk } = await setupDiscordSdk();
  /** channelIdの取得にdiscordのauth等は不要だが今後の実装しやすさを考えてやっとく */
  if (discordSdk.channelId === null) throw new Error("channelId is null");
  return discordSdk.channelId;
}

function App() {
  const [count, setCount] = useState(0);
  const socketRef = useRef<Socket<EventsMap>>(null);

  // Discord SDK認証とSocket.IO接続
  useEffect(() => {
    (async () => {
      socketRef.current = setupSocketIO(await getRoomId(), setCount);
    })();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const handleIncrement = () => {
    if (socketRef.current) socketRef.current.emit("incrementCount");
  };

  return (
    <div className="container">
      <h1>Counter App</h1>
      <span id="count">{count}</span>
      <button id="incrementButton" onClick={handleIncrement}>
        Increment
      </button>
    </div>
  );
}

export default App;
