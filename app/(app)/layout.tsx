"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import AuthGuard from "@/components/auth/AuthGuard";
import RouteProgress from "@/components/system/RouteProgress";
import PageTransition from "@/components/system/PageTransition";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import CommandPalette from "@/components/system/CommandPalette";
import { cn } from "@/lib/utils/cn";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AuthGuard>
      <RouteProgress />
      <div className="min-h-screen bg-bg">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <div
          className={cn(
            "flex min-h-screen flex-col transition-[margin] duration-300 ease-smooth",
            collapsed ? "md:ml-sidebar-sm" : "md:ml-sidebar"
          )}
        >
          <Topbar />
          <main className="flex-1 p-6 pb-24 md:pb-6">
            <ErrorBoundary>
              <PageTransition>{children}</PageTransition>
            </ErrorBoundary>
          </main>
        </div>
        <MobileBottomNav />
      </div>
      <CommandPalette />
    </AuthGuard>
  );
}
