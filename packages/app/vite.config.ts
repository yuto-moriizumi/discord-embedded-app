import { defineConfig } from "vite";
import mkcert from "vite-plugin-mkcert";

// https://vitejs.dev/config/
export default defineConfig({
  /**
   * DiscordのActivity URL Overrideを使用する場合httpsが必須(CSPによる規制)
   * https://discord.com/developers/docs/activities/development-guides#using-external-resources
   */
  plugins: [mkcert()],
  server: {
    /**
     * Discord proxyの動作をローカルで再現するための設定
     * Discord developer portal→Activity URL Mappingsにおいて、`/api`を本番サーバーのURLに転送する設定を行う環境を本番とすると、
     * 開発環境においては次の2種類のproxyを設定する必要がある。
     * なお、クライアントがWebブラウザの場合はこのproxyは使用されない。
     * 関連: https://discord.com/developers/docs/activities/development-guides#run-your-application-locally
     */
    proxy: {
      "/api/token": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/api/socketio": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
    allowedHosts: [".trycloudflare.com"],
  },
});
