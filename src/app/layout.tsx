import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

export const viewport: Viewport = {
  themeColor: "#090A0F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "MontLife — Central de Inteligência Operacional & Gestão de Demandas",
  description:
    "Plataforma de gestão integrada para chamados de TI, suporte ao usuário, rotinas institucionais e tarefas pessoais com armazenamento 100% nativo na nuvem.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MontLife",
  },
  icons: {
    icon: [
      { url: "/brand-logo-square.png?v=4", type: "image/png" },
      { url: "/favicon-32x32.png?v=4", sizes: "32x32", type: "image/png" },
      { url: "/icon.png?v=4", type: "image/png" },
      { url: "/favicon.ico?v=4" },
    ],
    shortcut: "/brand-logo-square.png?v=4",
    apple: "/apple-touch-icon.png?v=4",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/brand-logo-square.png?v=4" type="image/png" />
        <link rel="icon" href="/favicon-32x32.png?v=4" sizes="32x32" type="image/png" />
        <link rel="alternate icon" href="/icon.png?v=4" type="image/png" />
        <link rel="shortcut icon" href="/brand-logo-square.png?v=4" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased min-h-screen transition-colors duration-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
