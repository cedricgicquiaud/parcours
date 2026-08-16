import { afterEach, describe, expect, it } from "vitest";
import { variablesMermaid } from "./mermaid";

function racineAvec(palette: Record<string, string>): Element {
  const racine = document.documentElement;
  for (const [nom, valeur] of Object.entries(palette)) {
    racine.style.setProperty(nom, valeur);
  }
  return racine;
}

afterEach(() => {
  document.documentElement.removeAttribute("style");
});

describe("thème des schémas (mode sombre)", () => {
  it("prend les couleurs de la palette courante, pas celles de mermaid", () => {
    const variables = variablesMermaid(
      racineAvec({
        "--bg": "#0b0a09",
        "--pane": "#211f1c",
        "--text": "#eae7e4",
        "--line": "#37342f",
        "--accent": "#f2701f",
      }),
    );

    // Le défaut de mermaid — boîtes lavande, texte gris — était illisible ici.
    expect(variables.mainBkg).toBe("#211f1c");
    expect(variables.nodeTextColor).toBe("#eae7e4");
    expect(variables.textColor).toBe("#eae7e4");
    expect(variables.nodeBorder).toBe("#37342f");
    expect(variables.lineColor).toBe("#f2701f");
  });

  it("tombe sur des valeurs claires si la palette est absente", () => {
    const variables = variablesMermaid(document.documentElement);
    expect(variables.background).toBe("#ffffff");
    expect(variables.textColor).toBe("#302a22");
  });
});
