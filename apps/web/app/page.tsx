"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useEstado } from "../lib/estado";
import { Carregando } from "./carregando";

/** Entrada: quem já configurou vai para Hoje; quem não, para o começo. */
export default function Inicio() {
  const estado = useEstado();
  const router = useRouter();
  useEffect(() => {
    if (estado) router.replace(estado.perfil ? "/hoje" : "/comecar");
  }, [estado, router]);
  return <Carregando />;
}
