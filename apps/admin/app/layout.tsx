import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Todo Admin",
  description: "Operations dashboard for Todo ride platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

