import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { lecon, proprietesLecon as proprietes } from "./fixtures-lecon";
import { PageLecon } from "./Lecon";

const { initialize, rendre } = vi.hoisted(() => ({
  initialize: vi.fn(),
  rendre: vi.fn(async () => ({ svg: "<svg></svg>" })),
}));
vi.mock("mermaid", () => ({ default: { initialize, render: rendre } }));

const avecSchema = () =>
  lecon({
    html:
      '<div class="mermaid-source" data-source="graph LR&#10;A--&gt;B">' +
      "<pre><code>graph LR</code></pre></div>",
  });

describe("PageLecon — schémas mermaid", () => {
  it("mesure les libellés avec la police affichée (fontFamily racine)", async () => {
    render(<PageLecon {...proprietes} lecon={avecSchema()} />);
    await waitFor(() => expect(initialize).toHaveBeenCalled());

    // La MESURE des boîtes lit `config.fontFamily` (calculateTextDimensions),
    // pas `themeVariables.fontFamily` qui ne nourrit que le style. Sans le
    // niveau racine, mermaid mesure en Trebuchet MS, la page affiche en Open
    // Sans (plus large) : le dernier mot des libellés déborde et disparaît
    // (« Pull request » rendu « Pull », recette du 2026-08-19).
    const config = initialize.mock.calls[0]![0] as {
      fontFamily?: string;
      themeVariables: { fontFamily?: string };
    };
    expect(config.fontFamily).toBeTruthy();
    expect(config.fontFamily).toBe(config.themeVariables.fontFamily);
  });
});
