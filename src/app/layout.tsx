import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { HelpPanelProvider } from "@/components/help/help-panel-context";
import { HelpPanel } from "@/components/help/help-panel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/nav/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Workforce Platform",
  description: "AI员工管理与价值展示平台",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html
      lang="zh"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <TooltipProvider delay={300}>
        <HelpPanelProvider>
          <AppShell user={user ? { nickname: user.nickname, avatar: user.avatar } : null}>
            {children}
          </AppShell>
          <HelpPanel />
        </HelpPanelProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
