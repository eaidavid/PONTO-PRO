import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ponto Pro",
    short_name: "Ponto Pro",
    description: "Bata o ponto, veja quanto vai receber e quanto falta.",
    lang: "pt-BR",
    start_url: "/hoje",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7f5",
    theme_color: "#07352d",
    categories: ["productivity", "business", "finance"],
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Bater ponto", short_name: "Ponto", url: "/hoje", icons: [{ src: "/icones/icone-192.png", sizes: "192x192" }] },
      { name: "Lançar produção", short_name: "Produção", url: "/producao", icons: [{ src: "/icones/icone-192.png", sizes: "192x192" }] },
      { name: "Quanto vou receber", short_name: "Ganhos", url: "/ganhos", icons: [{ src: "/icones/icone-192.png", sizes: "192x192" }] },
    ],
  };
}
