import { describe, expect, it } from "vitest";
import { analyserJson, validerManifeste, type Manifeste, type Validation } from "./manifeste";

/** Analyse puis valide, comme le fait le scan (F-R2). */
function analyserManifeste(texte: string): Validation<Manifeste> {
  const json = analyserJson(texte);
  if (!json.ok) return json;
  return validerManifeste(json.valeur, "formation-claude");
}

/** Manifeste minimal valide, enrichi par le test. */
function manifeste(surcharge: Record<string, unknown> = {}): string {
  return JSON.stringify({
    formatVersion: 1,
    id: "formation-claude",
    titre: "Formation pratique Claude",
    modules: [
      {
        id: "fondations",
        titre: "Fondations",
        lecons: [{ id: "installer", titre: "Installer", fichier: "lecons/installer.md" }],
      },
    ],
    ...surcharge,
  });
}

function analyser(surcharge: Record<string, unknown> = {}) {
  return analyserManifeste(manifeste(surcharge));
}

function erreur(surcharge: Record<string, unknown>): string {
  const resultat = analyser(surcharge);
  if (resultat.ok) throw new Error("manifeste accepté alors qu'il devait être refusé");
  return resultat.erreur;
}

describe("compatibilité (FI-R1 à FI-R8)", () => {
  it("accepte un manifeste sans aucun champ de fiche", () => {
    const resultat = analyser();
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.valeur.couverture).toBeUndefined();
    expect(resultat.valeur.objectifs).toBeUndefined();
  });
});

describe("couverture (FI-R1)", () => {
  it("accepte un chemin relatif vers une image", () => {
    const resultat = analyser({ couverture: "assets/couverture.png" });
    expect(resultat.ok && resultat.valeur.couverture).toBe("assets/couverture.png");
  });

  it("refuse un chemin qui sort du dossier", () => {
    expect(erreur({ couverture: "../ailleurs.png" })).toMatch(/couverture/);
  });

  it("refuse un chemin absolu et un antislash", () => {
    expect(erreur({ couverture: "/etc/passwd.png" })).toMatch(/couverture/);
    expect(erreur({ couverture: "assets\\couverture.png" })).toMatch(/couverture/);
  });

  it("refuse une extension qui n'est pas une image", () => {
    expect(erreur({ couverture: "assets/notes.pdf" })).toMatch(/couverture/);
  });

  it("accepte une couverture dont le fichier n'existe pas — la validation ne lit pas le disque", () => {
    expect(analyser({ couverture: "assets/jamais-creee.png" }).ok).toBe(true);
  });
});

describe("présentation (FI-R2)", () => {
  it("accepte un texte long", () => {
    const resultat = analyser({ presentation: "# Titre\n\nUn paragraphe." });
    expect(resultat.ok && resultat.valeur.presentation).toContain("Un paragraphe.");
  });

  it("refuse au-delà de 8 000 caractères", () => {
    expect(erreur({ presentation: "a".repeat(8_001) })).toMatch(/presentation/);
  });

  it("refuse un type qui n'est pas une chaîne", () => {
    expect(erreur({ presentation: 42 })).toMatch(/presentation/);
  });
});

describe("objectifs et prérequis (FI-R3, FI-R4)", () => {
  it("accepte une liste de chaînes", () => {
    const resultat = analyser({ objectifs: ["Piloter Claude Code", "Écrire un hook"] });
    expect(resultat.ok && resultat.valeur.objectifs).toHaveLength(2);
  });

  it("traite une liste vide comme absente", () => {
    const resultat = analyser({ objectifs: [], prerequis: [] });
    expect(resultat.ok && resultat.valeur.objectifs).toBeUndefined();
    expect(resultat.ok && resultat.valeur.prerequis).toBeUndefined();
  });

  it("refuse plus de 12 entrées", () => {
    expect(erreur({ objectifs: Array.from({ length: 13 }, (_, i) => `o${i}`) })).toMatch(
      /objectifs/,
    );
  });

  it("refuse une entrée de plus de 200 caractères, en donnant son rang", () => {
    expect(erreur({ objectifs: ["court", "x".repeat(201)] })).toMatch(/objectifs\[1\]/);
  });

  it("refuse une entrée vide ou d'un autre type", () => {
    expect(erreur({ objectifs: ["  "] })).toMatch(/objectifs\[0\]/);
    expect(erreur({ prerequis: [3] })).toMatch(/prerequis\[0\]/);
  });

  it("refuse autre chose qu'un tableau", () => {
    expect(erreur({ prerequis: "un terminal" })).toMatch(/prerequis/);
  });
});

describe("durées (FI-R5, FI-R6)", () => {
  it("accepte une durée de formation en minutes", () => {
    expect(analyser({ duree: 1200 }).ok).toBe(true);
  });

  it("refuse 0, une valeur trop grande, une décimale", () => {
    expect(erreur({ duree: 0 })).toMatch(/duree/);
    expect(erreur({ duree: 100_001 })).toMatch(/duree/);
    expect(erreur({ duree: 12.5 })).toMatch(/duree/);
  });

  it("accepte et refuse une durée de leçon, avec son chemin JSON", () => {
    const avec = JSON.parse(manifeste()) as Record<string, unknown>;
    const modules = avec.modules as Array<{ lecons: Array<Record<string, unknown>> }>;
    modules[0]!.lecons[0]!.duree = 45;
    expect(analyserManifeste(JSON.stringify(avec)).ok).toBe(true);

    modules[0]!.lecons[0]!.duree = -1;
    const refuse = analyserManifeste(JSON.stringify(avec));
    expect(refuse.ok).toBe(false);
    if (!refuse.ok) expect(refuse.erreur).toMatch(/modules\[0\]\.lecons\[0\]\.duree/);
  });
});

describe("description de module (FI-R7)", () => {
  it("accepte une description courte et refuse au-delà de 500 caractères", () => {
    const avec = JSON.parse(manifeste()) as Record<string, unknown>;
    const modules = avec.modules as Array<Record<string, unknown>>;
    modules[0]!.description = "Le socle.";
    expect(analyserManifeste(JSON.stringify(avec)).ok).toBe(true);

    modules[0]!.description = "x".repeat(501);
    const refuse = analyserManifeste(JSON.stringify(avec));
    expect(refuse.ok).toBe(false);
    if (!refuse.ok) expect(refuse.erreur).toMatch(/modules\[0\]\.description/);
  });
});

describe("ordre de validation (FI-R8)", () => {
  it("signale un titre manquant avant un objectif fautif", () => {
    const resultat = analyserManifeste(
      JSON.stringify({ formatVersion: 1, id: "x", objectifs: [42], modules: [] }),
    );
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) expect(resultat.erreur).toMatch(/titre/);
  });
});
