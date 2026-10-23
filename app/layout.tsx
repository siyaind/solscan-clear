import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import "./globals.css";
import "./audit-improvements.css";
import "./anatomy.css";
import "./ux-improvements.css";

export const metadata: Metadata = {
  title: "Solscan / CLEAR — See what happened.",
  description:
    "A clearer lens on Solana. Understand the impact, follow the connections, and verify the evidence behind every transaction.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
