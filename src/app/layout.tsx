import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mont Ops — Hub de Produtividade, Wiki Técnica & Metrificação",
  description:
    "Hub Central de Produtividade, Base de Conhecimento e Motor de Metrificação com Inteligência Artificial Gemini e Sincronização Google Multi-Account.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased bg-[#0F0E17] text-[#EAE9FC] overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}

