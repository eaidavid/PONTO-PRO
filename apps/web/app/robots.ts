import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/site";

/** O Google lê as páginas abertas; as telas do app e as rotas do servidor ficam de fora. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/calculadoras", "/termos", "/privacidade"],
      disallow: ["/api/", "/hoje", "/historico", "/registros", "/producao", "/ganhos", "/metas", "/obras", "/conta", "/planos", "/calculadora", "/comecar", "/entrar", "/direitos"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
