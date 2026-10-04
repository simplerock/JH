import type { Metadata, Viewport } from "next";
import { RegisterSW } from "@/components/RegisterSW";
import { I18nProvider } from "@/components/I18nProvider";
import { getLang } from "@/lib/i18n/server";
import { getTheme } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home Hub",
  description: "Rutiner, mål och planer för hela familjen.",
  appleWebApp: { capable: true, title: "Home Hub", statusBarStyle: "default" },
};

const LIGHT = "#f6f4ef";
const DARK = "#141615";

export async function generateViewport(): Promise<Viewport> {
  const theme = await getTheme();
  return {
    themeColor:
      theme === "system"
        ? [
            { media: "(prefers-color-scheme: light)", color: LIGHT },
            { media: "(prefers-color-scheme: dark)", color: DARK },
          ]
        : theme === "dark" ? DARK : LIGHT,
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [theme, lang] = await Promise.all([getTheme(), getLang()]);
  return (
    <html lang={lang} data-theme={theme === "system" ? undefined : theme}>
      <body className="min-h-dvh antialiased">
        <I18nProvider lang={lang}>{children}</I18nProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
