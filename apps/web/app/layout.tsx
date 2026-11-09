import "@fontsource-variable/atkinson-hyperlegible-next/index.css";
import "@fontsource-variable/bricolage-grotesque/index.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Provedores } from "./provedores";

export const metadata: Metadata = {
  title: { default: "Ponto Pro", template: "%s · Ponto Pro" },
  description: "Bata o ponto, veja quanto vai receber e quanto falta.",
  applicationName: "Ponto Pro",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1210" },
  ],
};

/** Aplica o tema salvo antes de pintar a tela (sem "piscar"). */
const scriptTema = `try{var t=localStorage.getItem("pp-tema");if(t==="claro"||t==="escuro"||t==="sol")document.documentElement.dataset.tema=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-dvh antialiased">
        <Provedores>{children}</Provedores>
      </body>
    </html>
  );
}
