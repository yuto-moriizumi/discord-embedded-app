import { defineConfig } from "vite";
import mkcert from "vite-plugin-mkcert";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [mkcert()],
  server: {
    proxy: {
      "/api/token": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      // Socket.IO のリクエストをバックエンドサーバー (Cloudflare Tunnel経由) に転送 (Discord Portal用にパス変更)
      "/api/socketio": {
        target: "http://localhost:3001", // Socket.IOサーバーのURL (Cloudflare)
        changeOrigin: true, // オリジンを変更
        ws: true, // WebSocketプロキシを有効化
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
    allowedHosts: [".trycloudflare.com"],
  },
});
