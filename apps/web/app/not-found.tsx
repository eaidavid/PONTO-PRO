import { House } from "lucide-react";
import Link from "next/link";

export default function NaoEncontrada() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center gap-4 px-6">
      <h1 className="display text-32">Essa página não existe</h1>
      <p className="text-17 text-texto-2">O endereço pode ter mudado.</p>
      <Link href="/hoje" className="sombra-botao inline-flex min-h-16 items-center justify-center gap-3 rounded-full bg-primaria px-6 text-20 font-bold text-sobre-primaria">
        <House aria-hidden className="size-6" /> Voltar para Hoje
      </Link>
    </main>
  );
}
