import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import ToastProvider from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "TravelDesk Pro",
  description: "Enterprise travel-agency sales & accounting system",
};

const NO_FLASH_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('td-theme');
    var theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <MotionConfig reducedMotion="user">
          <ThemeProvider>
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
