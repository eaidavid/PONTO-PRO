import type { Metadata } from "next";
import { ConviteBeta } from "./convite";

export const metadata: Metadata = { title: "Convite do beta", robots: { index: false, follow: false } };

/** Link de convite do beta: /beta/OBRA-SP. Quem cria a conta por aqui ganha Pro de cortesia. */
export default async function PaginaConvite({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  return <ConviteBeta codigo={decodeURIComponent(codigo).toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 30)} />;
}
