import type { MetadataRoute } from "next";
import { CALCULADORAS, SITE_URL } from "../lib/site";

/** Páginas abertas para o Google: vendas, calculadoras e documentos. As telas do app ficam de fora. */
export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: agora, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/calculadoras`, lastModified: agora, changeFrequency: "monthly", priority: 0.8 },
    ...CALCULADORAS.map((c) => ({ url: `${SITE_URL}${c.caminho}`, lastModified: agora, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${SITE_URL}/termos`, lastModified: agora, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacidade`, lastModified: agora, changeFrequency: "yearly", priority: 0.2 },
  ];
}
