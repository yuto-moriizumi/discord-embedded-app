"use client";

import React, { useEffect, useState, useRef } from "react";
import { DiscordSDK, patchUrlMappings } from "@discord/embedded-app-sdk";
import { io, Socket } from "socket.io-client";

function isDiscordClient() {
  console.log(
    "Is this a Discord client?",
    typeof window !== "undefined",
    "DiscordNative" in window
  );
  return typeof window !== "undefined";
}

async function setupDiscordSdk(): Promise<string> {
  patchUrlMappings([
    {
      prefix: "/api",
      target: "localhost:3000",
    },
  ]);
  console.log("PATCHED");
  const discordSdk = new DiscordSDK(
    process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID as string
  );
  await discordSdk.ready();

  const { code } = await discordSdk.commands.authorize({
    client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID as string,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify", "guilds", "applications.commands"],
  });

  const response = await fetch("/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      `Failed to fetch token: ${data.error || response.statusText}`
    );
  }
  const accessToken = data.access_token;

  const auth = await discordSdk.commands.authenticate({
    access_token: accessToken,
  });
  if (!auth) throw new Error("Authentication failed");

  const currentRoomId = discordSdk.channelId;
  return currentRoomId!;
}

function setupSocketIO(
  roomId: string,
  setCount: React.Dispatch<React.SetStateAction<number>>
) {
  const socket: Socket = io({
    path: "/api/socketio",
  });

  socket.on("connect", () => {
    socket.emit("joinRoom", { roomId });
  });

  socket.on("updateCount", (newCount: number) => {
    setCount(newCount);
  });

  return socket;
}

async function getRoomId() {
  if (!isDiscordClient()) return "web";
  return setupDiscordSdk();
}

export default function Home() {
  const [count, setCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

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
