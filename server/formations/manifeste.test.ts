import { describe, expect, it } from "vitest";
import {
  analyserJson,
  cheminConfine,
  leconsOrdonnees,
  validerManifeste,
} from "./manifeste";

function manifesteValide() {
  return {
    formatVersion: 1,
    id: "formation-claude",
    titre: "Formation pratique Claude",
    description: "Compagnon pratique",
    modules: [
      {
        id: "fondations",
        titre: "Fondations",
        lecons: [
          { id: "installer", titre: "Installer", fichier: "lecons/installer.md" },
          { id: "mode-plan", titre: "Le mode plan", fichier: "lecons/mode-plan.md" },
        ],
      },
    ],
  };
}

function erreurDe(brut: unknown, nomDossier = "formation-claude"): string {
  const resultat = validerManifeste(brut, nomDossier);
  if (resultat.ok) throw new Error("manifeste accepté alors qu'il devait échouer");
  return resultat.erreur;
}

describe("analyserJson (C-R5, F-R4)", () => {
  it("accepte un JSON valide", () => {
    expect(analyserJson('{"a":1}')).toEqual({ ok: true, valeur: { a: 1 } });
  });

  it("signale la position de l'erreur de parse", () => {
    const resultat = analyserJson("{ oups }");
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) expect(resultat.erreur).toMatch(/formation\.json illisible/);
  });

  it("refuse un manifeste de plus d'1 Mo", () => {
    const gros = `{"bourrage":"${"x".repeat(1_000_001)}"}`;
    expect(analyserJson(gros)).toEqual({
      ok: false,
      erreur: "manifeste trop volumineux",
    });
  });
});

describe("validerManifeste — cas nominal", () => {
  it("accepte un manifeste conforme", () => {
    const resultat = validerManifeste(manifesteValide(), "formation-claude");
    expect(resultat.ok).toBe(true);
    if (resultat.ok) expect(resultat.valeur.titre).toBe("Formation pratique Claude");
  });

  it("ignore les champs inconnus (tolérance ascendante F-R4)", () => {
    const brut = { ...manifesteValide(), couleur: "orange" };
    const resultat = validerManifeste(brut, "formation-claude");
    expect(resultat.ok).toBe(true);
    if (resultat.ok) expect("couleur" in resultat.valeur).toBe(false);
  });
});

describe("validerManifeste — formatVersion (F-R2)", () => {
  it("refuse un formatVersion absent", () => {
    const brut = manifesteValide() as Record<string, unknown>;
    delete brut.formatVersion;
    expect(erreurDe(brut)).toBe("formatVersion manquant");
  });

  it("refuse une version inconnue avec la liste des versions supportées", () => {
    expect(erreurDe({ ...manifesteValide(), formatVersion: 2 })).toBe(
      "version de format 2 inconnue (versions supportées : 1)",
    );
  });
});

describe("validerManifeste — champs (F-R4)", () => {
  it("signale un champ manquant avec son chemin JSON exact", () => {
    const brut = manifesteValide();
    delete (brut.modules[0]!.lecons[1] as { id?: string }).id;
    expect(erreurDe(brut)).toBe("modules[0].lecons[1].id manquant");
  });

  it("refuse une formation sans module", () => {
    expect(erreurDe({ ...manifesteValide(), modules: [] })).toBe(
      "modules : au moins un module attendu",
    );
  });

  it("refuse un module sans leçon", () => {
    const brut = manifesteValide();
    brut.modules[0]!.lecons = [];
    expect(erreurDe(brut)).toBe("modules[0].lecons : au moins une leçon attendue");
  });
});

describe("validerManifeste — slugs et dossier (F-R3)", () => {
  it("refuse un slug invalide avec son chemin", () => {
    const brut = manifesteValide();
    brut.modules[0]!.id = "Fondations";
    expect(erreurDe(brut)).toBe("modules[0].id : slug invalide");
  });

  it("compare l'id au nom du dossier de façon sensible à la casse", () => {
    expect(erreurDe(manifesteValide(), "Formation-Claude")).toBe(
      'id "formation-claude" ≠ nom du dossier "Formation-Claude"',
    );
  });

  it("refuse un id de plus de 64 caractères", () => {
    const long = "a".repeat(65);
    const brut = manifesteValide();
    brut.modules[0]!.lecons[0]!.id = long;
    expect(erreurDe(brut)).toBe("modules[0].lecons[0].id : slug invalide");
  });
});

describe("validerManifeste — unicité (F-R3)", () => {
  it("refuse deux leçons de même id, même dans des modules différents", () => {
    const brut = manifesteValide();
    brut.modules.push({
      id: "skills",
      titre: "Skills",
      lecons: [{ id: "installer", titre: "Autre", fichier: "lecons/autre.md" }],
    });
    expect(erreurDe(brut)).toBe('modules[1].lecons[0].id "installer" en double');
  });

  it("refuse deux modules de même id", () => {
    const brut = manifesteValide();
    brut.modules.push({
      id: "fondations",
      titre: "Doublon",
      lecons: [{ id: "autre", titre: "Autre", fichier: "lecons/autre.md" }],
    });
    expect(erreurDe(brut)).toBe('modules[1].id "fondations" en double');
  });
});

describe("validerManifeste — ordre de validation (F-R11)", () => {
  it("signale la version avant le champ manquant", () => {
    const brut = manifesteValide() as Record<string, unknown>;
    brut.formatVersion = 9;
    delete brut.titre;
    expect(erreurDe(brut)).toMatch(/^version de format 9 inconnue/);
  });

  it("signale le champ manquant avant le slug invalide", () => {
    const brut = manifesteValide();
    brut.modules[0]!.id = "MAJUSCULES";
    delete (brut.modules[0]!.lecons[0] as { titre?: string }).titre;
    expect(erreurDe(brut)).toBe("modules[0].lecons[0].titre manquant");
  });

  it("signale l'unicité avant le confinement du chemin", () => {
    const brut = manifesteValide();
    brut.modules[0]!.lecons[1]!.id = "installer";
    brut.modules[0]!.lecons[1]!.fichier = "../ailleurs.md";
    expect(erreurDe(brut)).toBe('modules[0].lecons[1].id "installer" en double');
  });
});

describe("cheminConfine (F-R5)", () => {
  it.each([
    "/etc/passwd",
    "../ailleurs.md",
    "lecons/../../ailleurs.md",
    "lecons\\windows.md",
  ])("refuse %s", (valeur) => {
    expect(cheminConfine(valeur)).toEqual({
      ok: false,
      erreur: `chemin hors formation : ${valeur}`,
    });
  });

  it("accepte un chemin relatif simple", () => {
    expect(cheminConfine("lecons/installer.md")).toEqual({
      ok: true,
      valeur: "lecons/installer.md",
    });
  });

  it("remonte l'erreur de confinement depuis le manifeste", () => {
    const brut = manifesteValide();
    brut.modules[0]!.lecons[0]!.fichier = "../secret.md";
    expect(erreurDe(brut)).toBe("chemin hors formation : ../secret.md");
  });
});

describe("leconsOrdonnees (P-R3, S-R5)", () => {
  it("aplatit les leçons dans l'ordre du manifeste", () => {
    const brut = manifesteValide();
    brut.modules.push({
      id: "skills",
      titre: "Skills",
      lecons: [{ id: "anatomie", titre: "Anatomie", fichier: "lecons/anatomie.md" }],
    });
    const resultat = validerManifeste(brut, "formation-claude");
    if (!resultat.ok) throw new Error(resultat.erreur);
    expect(leconsOrdonnees(resultat.valeur).map((e) => e.lecon.id)).toEqual([
      "installer",
      "mode-plan",
      "anatomie",
    ]);
  });
});
