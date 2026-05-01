import type { Metadata } from "next";
import "./globals.css";
import { HelpPanelProvider } from "@/components/help/help-panel-context";
import { HelpPanel } from "@/components/help/help-panel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCurrentUserWithPermissions } from "@/lib/authz-server";
import { AppShell } from "@/components/nav/app-shell";

export const metadata: Metadata = {
  title: "AI Workforce Platform",
  description: "AI员工管理与价值展示平台",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentUserWithPermissions();

  return (
    <html lang="zh" className="h-full antialiased">
      <body className="h-full">
        <TooltipProvider delay={300}>
        <HelpPanelProvider>
          <AppShell
            user={me ? { nickname: me.nickname, avatar: me.avatar } : null}
            permissions={me?.permissions ?? null}
          >
            {children}
          </AppShell>
          <HelpPanel />
        </HelpPanelProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
