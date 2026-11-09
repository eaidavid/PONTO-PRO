import type { Metadata } from "next";
import { Vitrine } from "./vitrine";

export const metadata: Metadata = { title: "Design system" };

export default function PaginaUI() {
  return <Vitrine />;
}
