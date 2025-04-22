import { DiscordSDK } from "@discord/embedded-app-sdk";

export async function setupDiscordSdk() {
  const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
  await discordSdk.ready();

  const { code } = await discordSdk.commands.authorize({
    client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify", "guilds", "applications.commands"],
  });

  const response = await window.fetch("/api/token", {
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

  return { discordSdk, auth };
}
