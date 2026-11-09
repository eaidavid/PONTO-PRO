import { redirect } from "next/navigation";

/** "Registros" virou "Histórico". */
export default function Registros() {
  redirect("/historico");
}
