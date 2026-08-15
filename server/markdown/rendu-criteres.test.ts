import { beforeAll, describe, expect, it } from "vitest";
import { FORMAT_ID_CRITERE, MAX_CRITERES } from "./criteres";
import { MoteurRendu, type CollecteCriteres, type ContexteRendu } from "./rendu";

let moteur: MoteurRendu;

const BASE: Omit<ContexteRendu, "criteres"> = {
  formationId: "formation-claude",
  dossier: "/inexistant",
  idsLecons: new Set<string>(),
};

beforeAll(async () => {
  moteur = await MoteurRendu.creer();
}, 30_000);

function collecte(etats: Record<string, boolean> = {}): CollecteCriteres {
  return { etats: new Map(Object.entries(etats)), liste: [], tronquee: false };
}

function rendre(markdown: string, criteres?: CollecteCriteres): string {
  return moteur.rendre(markdown, criteres ? { ...BASE, criteres } : BASE);
}

describe("rendu interactif des critères (CR-R1, CR-R16)", () => {
  it("rend une case cochable et identifiée quand un collecteur est fourni", () => {
    const sac = collecte();
    const html = rendre("- [ ] uv run forma list affiche les 7 cours", sac);

    expect(html).not.toContain("disabled");
    expect(html).toContain(`data-critere="${sac.liste[0]!.id}"`);
    expect(sac.liste[0]!.id).toMatch(FORMAT_ID_CRITERE);
  });

  it("garde les cases inertes sans collecteur — aperçu de l'éditeur (CR-R15b)", () => {
    const html = rendre("- [ ] à faire");
    expect(html).toContain('<input type="checkbox" disabled>');
    expect(html).not.toContain("data-critere");
  });

  it("liste les critères dans l'ordre du document, avec leur texte", () => {
    const sac = collecte();
    rendre("- [ ] premier critère\n- [x] second critère", sac);

    expect(sac.liste.map((critere) => critere.texte)).toEqual([
      "premier critère",
      "second critère",
    ]);
    expect(sac.tronquee).toBe(false);
  });

  it("compte un critère même dans un bloc solution (CR-R1)", () => {
    const sac = collecte();
    rendre(":::solution\n- [ ] la solution compile\n:::", sac);
    expect(sac.liste).toHaveLength(1);
  });
});

describe("état de départ et état enregistré (CR-R7)", () => {
  it("coche par défaut un `- [x]` jamais touché", () => {
    const sac = collecte();
    const html = rendre("- [x] déjà fait", sac);
    expect(html).toContain("checked");
    expect(sac.liste[0]!.coche).toBe(true);
  });

  it("laisse l'état enregistré primer sur le markdown, dans les deux sens", () => {
    const vide = collecte();
    rendre("- [ ] à faire\n- [x] déjà fait", vide);
    const [aFaire, dejaFait] = vide.liste;

    const sac = collecte({ [aFaire!.id]: true, [dejaFait!.id]: false });
    const html = rendre("- [ ] à faire\n- [x] déjà fait", sac);

    expect(sac.liste[0]!.coche).toBe(true);
    expect(sac.liste[1]!.coche).toBe(false);
    expect(html.match(/checked/g)).toHaveLength(1);
  });
});

describe("plafond par leçon (CR-R2b)", () => {
  it("désactive les critères au-delà du plafond et le signale", () => {
    const sac = collecte();
    const markdown = Array.from(
      { length: MAX_CRITERES + 2 },
      (_, index) => `- [ ] critère numéro ${index}`,
    ).join("\n");
    const html = rendre(markdown, sac);

    expect(sac.liste).toHaveLength(MAX_CRITERES);
    expect(sac.tronquee).toBe(true);
    expect(html.match(/disabled/g)).toHaveLength(2);
  });
});
