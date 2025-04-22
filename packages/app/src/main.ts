import "./style.css";
import { DiscordSDK, patchUrlMappings } from "@discord/embedded-app-sdk";
import { io, Socket } from "socket.io-client"; // Socket.IOクライアントをインポート

// Discord SDKの初期化

let count = 0;
let currentRoomId: string | null = null; // ボイスチャンネルIDを後でセット

// Socket.IO関連のセットアップ
function setupSocketIO(roomId: string) {
  // Socket.IOクライアントの初期化 (Viteプロキシ経由で接続、パスを /socketio に指定)
  const socket: Socket = io({
    // Viteプロキシ設定により、'/socketio' へのリクエストが転送される
    path: "/api/socketio", // Discord Portalの制約に合わせてパスを指定
  });
  socket.on("connect", () => {
    console.log(`Connected to Socket.IO server with id: ${socket.id}`);
    if (roomId) {
      socket.emit("joinRoom", { roomId });
      console.log(`Joining room: ${roomId}`);
    } else {
      console.error("Could not get channelId to join room.");
      // エラー処理: ルームに参加できない場合
    }
  });

  // サーバーからのカウント更新イベントをリッスン
  socket.on("updateCount", (newCount: number) => {
    console.log(`Received count update: ${newCount}`);
    count = newCount;
    updateCountDisplay();
  });

  // Socket.IO接続エラーハンドリング (任意)
  socket.on("connect_error", (err) => {
    console.error("Socket.IO connection error:", err);
  });

  return socket;
}

async function setupDiscordSdk() {
  try {
    console.log("Setting up Discord SDK...");
    const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
    // === Discord SDK関連コード (全体をコメントアウト) ===
    console.log("Not ready yet.");
    await discordSdk.ready();
    console.log("Discord SDK is ready");

    console.log(import.meta.env.VITE_DISCORD_CLIENT_ID);
    // アプリケーションを認証
    const { code } = await discordSdk.commands.authorize({
      client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
      response_type: "code",
      state: "",
      prompt: "none",
      scope: ["identify", "guilds", "applications.commands"],
    });
    console.log("Authorization is successful");

    patchUrlMappings([
      {
        prefix: "/api",
        // target: "rica-lone-queensland-understand.trycloudflare.com",
        target: "localhost:3000",
      },
    ]);

    // 認証コードを使ってサーバーからアクセストークンを取得
    let accessToken = null;
    const response = await fetch("/api/token", {
      // Viteの開発サーバーがプロキシしてくれる想定
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
    accessToken = data.access_token;
    console.log("Access token obtained");

    // 取得したアクセストークンでユーザーを認証
    const auth = await discordSdk.commands.authenticate({
      access_token: accessToken,
    });
    if (!auth) {
      console.error("Authentication failed");
      // エラー処理
      return;
    }

    console.log(
      `Authenticated as ${auth.user.username}#${auth.user.discriminator}`
    );

    // === Discord SDK関連コード (全体をコメントアウト) ===
    // Socket.IOのセットアップを呼び出す (Discord認証後に行う場合はここ -> 今回は直接呼び出す)
    // setupSocketIO(); // ← Discord SDK有効時にここを有効化
    // 初期カウントはサーバーから取得するため、ここでは設定しない (コメントアウト済み)
    const { participants } =
      await discordSdk.commands.getInstanceConnectedParticipants();
    console.log("Connected users:", participants);

    // ボイスチャンネルIDを取得してSocket.IOのルームIDとして使用
    currentRoomId = discordSdk.channelId;
    if (currentRoomId) {
      socket = setupSocketIO(currentRoomId);
    } else {
      console.error("channelIdが取得できませんでした。");
    }
    // count = participants.length;
  } catch (error) {
    console.error("Error fetching access token:", error);
    // エラー処理: ユーザーに通知するなど
    return; // アクセストークンがないと進めない
  }
}

const countElement = document.getElementById("count") as HTMLSpanElement;
const incrementButton = document.getElementById(
  "incrementButton"
) as HTMLButtonElement;

// // カウンター表示を更新
function updateCountDisplay() {
  if (countElement) {
    countElement.textContent = count.toString();
  }
}

// // カウンター増加リクエストをサーバーに送信
function incrementAndNotify(socket: Socket) {
  // サーバーにincrementCountイベントを送信
  socket.emit("incrementCount");
  console.log("Sent incrementCount event to server.");
  // UIの更新はサーバーからのupdateCountイベントで行われるため、ここでは何もしない
}

// // 以前のDiscord SDKコマンドベースの処理は不要なため削除

// // Socket.IOのセットアップを直接呼び出す
// const socket = setupSocketIO(); // setupDiscordSdk内で呼び出すように変更

let socket: Socket | null = null;

if (incrementButton) {
  // ボタンクリック時の処理を変更
  incrementButton.addEventListener("click", () => {
    if (socket) {
      incrementAndNotify(socket);
    }
  });
}

// // 初期表示
updateCountDisplay();

console.log("Counter app initialized.");

// Discord SDKが利用可能かどうかで分岐
function isDiscordClient() {
  // Discord埋め込み環境ではwindow.DiscordNativeが存在することが多い
  // もしくはUserAgentや他の判定方法も考えられる
  // ここではDiscord SDKの有無で判定
  return typeof window !== "undefined" && "DiscordNative" in window;
}

if (isDiscordClient()) {
  setupDiscordSdk();
} else {
  // Webクライアントの場合
  currentRoomId = "web";
  socket = setupSocketIO(currentRoomId);
}
