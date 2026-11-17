import { describe, expect, it } from "vitest";
import { lerHoraDigitada } from "../../../packages/ui/src/componentes/SeletorHora";

describe("hora digitada", () => {
  it("aceita só números, com ou sem dois pontos", () => {
    expect(lerHoraDigitada("1158")).toBe("11:58");
    expect(lerHoraDigitada("11:58")).toBe("11:58");
    expect(lerHoraDigitada("930")).toBe("09:30");
    expect(lerHoraDigitada("7")).toBe("07:00");
    expect(lerHoraDigitada("0000")).toBe("00:00");
  });
  it("recusa o que não é horário", () => {
    expect(lerHoraDigitada("2400")).toBeNull();
    expect(lerHoraDigitada("1260")).toBeNull();
    expect(lerHoraDigitada("")).toBeNull();
    expect(lerHoraDigitada("12345")).toBeNull();
  });
});
