"use client";

import { CircleCheck, Undo2 } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

export interface ToastDados {
  texto: string;
  /** Mostra o botão "Desfazer". */
  desfazer?: () => void;
  /** Padrão: 5 segundos. */
  duracao?: number;
}

interface ToastAtual extends ToastDados {
  id: number;
}

const Contexto = createContext<{ mostrar: (t: ToastDados) => void }>({ mostrar: () => {} });

export function useToast() {
  return useContext(Contexto);
}

/** Toast com "Desfazer" por 5 segundos. Substitui modais de confirmação. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [atual, setAtual] = useState<ToastAtual | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mostrar = useCallback((t: ToastDados) => {
    clearTimeout(timer.current);
    setAtual({ ...t, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!atual) return;
    timer.current = setTimeout(() => setAtual(null), atual.duracao ?? 5000);
    return () => clearTimeout(timer.current);
  }, [atual]);

  return (
    <Contexto.Provider value={{ mostrar }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 print:hidden">
        {atual && <Toast key={atual.id} {...atual} onFechar={() => setAtual(null)} />}
      </div>
    </Contexto.Provider>
  );
}

/** Visual do toast (também usado isolado na vitrine). */
export function Toast({ texto, desfazer, duracao = 5000, onFechar }: ToastDados & { onFechar?: () => void }) {
  return (
    <div className="pointer-events-auto relative flex w-full max-w-[520px] items-center gap-3 overflow-hidden rounded-cartao bg-texto py-2 pr-2 pl-4 text-fundo shadow-painel animate-entrar">
      <CircleCheck aria-hidden className="size-6 shrink-0 text-[color:var(--primaria-suave)]" />
      <p className="numeros flex-1 py-2 text-17 font-bold">{texto}</p>
      {desfazer && (
        <button
          type="button"
          onClick={() => {
            desfazer();
            onFechar?.();
          }}
          className="inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-17 font-bold text-fundo underline underline-offset-4 active:bg-white/10"
        >
          <Undo2 aria-hidden className="size-5" /> Desfazer
        </button>
      )}
      <span aria-hidden className="barra-tempo absolute inset-x-0 bottom-0 h-1 bg-[color:var(--primaria-suave)]" style={{ animationDuration: `${duracao}ms` }} />
    </div>
  );
}
