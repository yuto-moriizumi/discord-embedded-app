import "./globals.css";
import React from "react";

export const metadata = {
  title: "Discord Counter App",
  description: "Discord Embedded Counter App (Next.js)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
