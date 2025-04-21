import './style.css';
import { DiscordSDK } from '@discord/embedded-app-sdk';

// Discord SDKの初期化
const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);

async function setupDiscordSdk() {
  await discordSdk.ready();
  console.log("Discord SDK is ready");

  // アプリケーションを認証
  const { code } = await discordSdk.commands.authorize({
    client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: [
      "identify",
      "guilds",
    ],
  });

  // 認証コードを使ってアクセストークンを取得 (サーバーサイドで実装)
  // このサンプルではサーバーサイドの実装は省略
  console.log(`Authorization code: ${code}`);

  // ユーザー情報を取得 (例)
  const { user } = await discordSdk.commands.authenticate({ access_token: 'dummy_token' }); // 本番では実際のトークンを使用
  console.log(`Authenticated as ${user.username}#${user.discriminator}`);

  // インスタンスチャンネルを取得してイベントを購読
  const channel = await discordSdk.commands.getInstanceChannel();
  if (channel) {
    console.log(`Instance channel: ${channel.name}`);
    discordSdk.subscribe('ACTIVITY_INSTANCE_COMMAND', handleCommand);
  } else {
    console.error("Could not get instance channel");
  }
}

const countElement = document.getElementById('count') as HTMLSpanElement;
const incrementButton = document.getElementById('incrementButton') as HTMLButtonElement;

let count = 0;

// カウンター表示を更新
function updateCountDisplay() {
  if (countElement) {
    countElement.textContent = count.toString();
  }
}

// カウンターを増やし、他の参加者に通知
function incrementAndNotify() {
  count++;
  updateCountDisplay();
  // 他の参加者にコマンドを送信
  discordSdk.commands.sendCommand({ cmd: 'INCREMENT_COUNT', args: { value: count } })
    .catch(console.error);
}

// 受信したコマンドを処理
function handleCommand(event: any) {
  console.log("Received command:", event);
  const { cmd, args } = event.data; // Vite HMRからのメッセージと区別するためdataプロパティを確認
  if (cmd === 'INCREMENT_COUNT' && args && typeof args.value === 'number') {
    // 他のユーザーからの更新を反映
    if (args.value > count) { // 自分の更新は無視
        count = args.value;
        updateCountDisplay();
    }
  }
}


setupDiscordSdk().catch(console.error);

if (incrementButton) {
  // ボタンクリック時の処理を変更
  incrementButton.addEventListener('click', incrementAndNotify);
}

// 初期表示
updateCountDisplay();

console.log('Counter app initialized.');
