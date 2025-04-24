import express from "express";
import cors from "cors"; // corsをインポート
import dotenv from "dotenv";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { EventsMap } from "shared"; // パッケージ名でインポート
import { setupSocketHandlers } from "./socketHandlers"; // Socketハンドラをインポート

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer<EventsMap>(server, {
  cors: {
    origin: "*", // 開発用にすべてのオリジンを許可 (本番では制限推奨)
    methods: ["GET", "POST"],
  },
  path: "/socketio", // 待ち受けパスを /socketio に変更
});
const port = process.env.PORT || 3000;

// Socket.IOイベントハンドラを設定
setupSocketHandlers(io);

// CORSミドルウェアを適用 (すべてのオリジンを許可)
app.use(cors({ origin: "*" }));

app.use(express.json());

// ヘルスチェック用ルート
app.get("/", (req, res) => {
  res.send("hello world");
});

app.post("/token", async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Authorization code is required" });
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI; // Discord Developer Portalで設定したリダイレクトURI

  if (!clientId || !clientSecret || !redirectUri) {
    console.error("Missing Discord credentials or redirect URI in .env");
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const obj = {
      client_id: clientId, // 環境変数から取得
      client_secret: clientSecret, // 環境変数から取得
      grant_type: "authorization_code",
      code: code,
    };

    const response = await fetch(`https://discord.com/api/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(obj),
    });
    const { access_token } = await response.json();

    res.send({ access_token });
  } catch (error: any) {
    console.error(
      "Error exchanging token:",
      error.response?.data || error.message
    );
    res
      .status(error.response?.status || 500)
      .json({ error: "Failed to exchange token" });
  }
});

// HTTPサーバーを起動 (これによりSocket.IOも起動する)
server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
