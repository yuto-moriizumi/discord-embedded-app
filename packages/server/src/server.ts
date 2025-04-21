import express from "express";
import dotenv from "dotenv";
import http from "http"; // httpモジュールをインポート
import { Server as SocketIOServer } from "socket.io"; // Socket.IOサーバーをインポート

dotenv.config(); // .envファイルから環境変数を読み込む

const app = express();
const server = http.createServer(app); // ExpressアプリからHTTPサーバーを作成
const io = new SocketIOServer(server, {
  // HTTPサーバーにSocket.IOをアタッチ
  cors: {
    origin: "*", // 開発用にすべてのオリジンを許可 (本番では制限推奨)
    methods: ["GET", "POST"],
  },
  path: "/socketio", // 待ち受けパスを /socketio に変更
});
const port = process.env.PORT || 3000; // 環境変数またはデフォルトポート

// ルームごとのカウンター状態を保持するMap
const roomCounts = new Map<string, number>();

// Socket.IO接続ハンドラ
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);
  let currentRoomId: string | null = null; // この接続が現在属しているルームID

  // ルーム参加イベント
  socket.on("joinRoom", ({ roomId }: { roomId: string }) => {
    if (!roomId) return;

    // 既存のルームから退出 (もしあれば)
    if (currentRoomId && currentRoomId !== roomId) {
      socket.leave(currentRoomId);
      console.log(`Socket ${socket.id} left room ${currentRoomId}`);
    }

    // 新しいルームに参加 (既に参加済みでなければ)
    if (currentRoomId !== roomId) {
      socket.join(roomId);
      currentRoomId = roomId;
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    }

    // ルームの現在のカウントを取得 (なければ0で初期化)
    const currentCount = roomCounts.get(roomId) || 0;
    if (!roomCounts.has(roomId)) {
      roomCounts.set(roomId, 0);
    }

    // 参加したクライアントに現在のカウントを送信
    socket.emit("updateCount", currentCount);
  });

  // カウント増加イベント
  socket.on("incrementCount", () => {
    if (!currentRoomId) {
      console.log(
        `Socket ${socket.id} tried to increment count without joining a room.`
      );
      return; // ルームに参加していない場合は何もしない
    }

    const currentCount = roomCounts.get(currentRoomId) || 0;
    const newCount = currentCount + 1;
    roomCounts.set(currentRoomId, newCount);

    // 同じルームの全クライアントに新しいカウントをブロードキャスト
    io.to(currentRoomId).emit("updateCount", newCount);
    console.log(
      `Room ${currentRoomId} count incremented to ${newCount} by ${socket.id}`
    );
  });

  // 切断イベント
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
    // 必要であれば、ここでユーザーがルームから完全に退出した際の処理を追加
    // (例: ルームに誰もいなくなったらカウントをリセットするなど)
    // この例ではシンプルにするため、切断時のルーム退出処理は省略
    currentRoomId = null; // ルーム情報をクリア (再接続時に再度joinRoomが必要)
  });
});

// CORSミドルウェアはSocket.IO設定でカバーされるため、ここでは不要な場合がある
// app.use(cors());
app.use(express.json()); // JSONリクエストボディをパース

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
    console.log({ obj });
    const params = new URLSearchParams(obj).toString();

    // const response = await axios.post(
    //   `https://discord.com/api/oauth2/token`,
    //   params,
    //   {
    //     headers: {
    //       "Content-Type": "application/x-www-form-urlencoded",
    //     },
    //   }
    // );
    const response = await fetch(`https://discord.com/api/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(obj),
    });
    console.log({ response });
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
