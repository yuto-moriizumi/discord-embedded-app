import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  server: {
    // proxy: {
    //   // '/api' で始まるリクエストを http://localhost:3001 に転送
    //   "/api": {
    //     target: "http://localhost:3001",
    //     changeOrigin: true,
    //     // オプション: パスを書き換えない場合
    //     // rewrite: (path) => path.replace(/^\/api/, '')
    //   },
    //   // Socket.IO のリクエストをバックエンドサーバー (Cloudflare Tunnel経由) に転送 (Discord Portal用にパス変更)
    //   "/socketio": {
    //     // パスを /socket.io から /socketio に変更
    //     target: "https://localhost:3001", // Socket.IOサーバーのURL (Cloudflare)
    //     changeOrigin: true, // オリジンを変更
    //     ws: true, // WebSocketプロキシを有効化
    //     // Socket.IOサーバー側は /socket.io を期待しているので、パスを書き換える
    //     rewrite: (path) => path.replace(/^\/socketio/, "/socket.io"),
    //   },
    // },
    allowedHosts: [".trycloudflare.com"],
  },
});
