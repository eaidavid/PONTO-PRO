import "@fontsource-variable/atkinson-hyperlegible-next/index.css";
import "@fontsource-variable/bricolage-grotesque/index.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { MARCA } from "../lib/marca";
import { Provedores } from "./provedores";

export const metadata: Metadata = {
  title: { default: MARCA.nome, template: `%s · ${MARCA.nome}` },
  description: MARCA.descricao,
  applicationName: MARCA.nome,
  appleWebApp: { capable: true, title: MARCA.nome, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
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
const scriptTema = `try{var d=document.documentElement,t=localStorage.getItem("pp-tema"),z=localStorage.getItem("pp-tamanho");if(t==="claro"||t==="escuro"||t==="sol")d.dataset.tema=t;if(z==="compacto"||z==="grande")d.dataset.tamanho=z}catch(e){}`;

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
