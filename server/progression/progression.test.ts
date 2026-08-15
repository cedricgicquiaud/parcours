import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Manifeste } from "../formations/manifeste";
import { calculerAvancement, voisines } from "./calculs";
import { BaseProgression } from "./db";

let dossier: string;
let chemin: string;
let base: BaseProgression;

beforeEach(async () => {
  dossier = await fs.mkdtemp(path.join(os.tmpdir(), "parcours-db-"));
  chemin = path.join(dossier, "parcours.db");
  base = BaseProgression.ouvrir(chemin);
});

afterEach(async () => {
  base.fermer();
  await fs.rm(dossier, { recursive: true, force: true });
});

const manifeste: Manifeste = {
  formatVersion: 1,
  id: "formation-claude",
  titre: "Formation pratique Claude",
  modules: [
    {
      id: "fondations",
      titre: "Fondations",
      lecons: [
        { id: "installer", titre: "Installer", fichier: "lecons/a.md" },
        { id: "mode-plan", titre: "Le mode plan", fichier: "lecons/b.md" },
      ],
    },
    {
      id: "skills",
      titre: "Agent Skills",
      lecons: [{ id: "anatomie", titre: "Anatomie", fichier: "lecons/c.md" }],
    },
  ],
};

describe("BaseProgression — coche (P-R2)", () => {
  it("coche et décoche de façon idempotente", () => {
    base.cocher("f", "l");
    base.cocher("f", "l");
    expect([...base.leconsCochees("f")]).toEqual(["l"]);
    base.decocher("f", "l");
    base.decocher("f", "l");
    expect([...base.leconsCochees("f")]).toEqual([]);
  });

  it("sépare les formations", () => {
    base.cocher("f1", "l");
    base.cocher("f2", "autre");
    expect([...base.leconsCochees("f1")]).toEqual(["l"]);
    expect(base.toutesLesCoches().get("f2")).toEqual(new Set(["autre"]));
  });
});

describe("BaseProgression — persistance (P-R6)", () => {
  it("relit la progression après réouverture", () => {
    base.cocher("f", "l");
    base.fermer();
    base = BaseProgression.ouvrir(chemin);
    expect([...base.leconsCochees("f")]).toEqual(["l"]);
    expect(base.reinitialisee).toBe(false);
  });

  it("active le mode WAL", () => {
    base.cocher("f", "l");
    expect(fsSync.existsSync(`${chemin}-wal`)).toBe(true);
  });
});

describe("BaseProgression — base corrompue (P-R1)", () => {
  it("sauvegarde la base illisible et repart d'une base neuve", () => {
    base.fermer();
    fsSync.writeFileSync(chemin, "ceci n'est pas une base SQLite", "utf8");
    base = BaseProgression.ouvrir(chemin);
    expect(base.reinitialisee).toBe(true);
    expect(base.sauvegardeCorrompue).toMatch(/parcours\.db\.corrupt-/);
    expect(fsSync.existsSync(base.sauvegardeCorrompue!)).toBe(true);
    base.cocher("f", "l");
    expect([...base.leconsCochees("f")]).toEqual(["l"]);
  });
});

describe("BaseProgression — reset et nettoyage (P-R4, P-R5)", () => {
  it("réinitialise une formation, orphelines incluses", () => {
    base.cocher("f", "installer");
    base.cocher("f", "disparue");
    base.cocher("autre", "installer");
    expect(base.reinitialiser("f")).toBe(2);
    expect([...base.leconsCochees("f")]).toEqual([]);
    expect([...base.leconsCochees("autre")]).toEqual(["installer"]);
  });

  it("ne purge que les orphelines", () => {
    base.cocher("f", "installer");
    base.cocher("f", "disparue");
    expect(base.nettoyerOrphelines("f", new Set(["installer"]))).toBe(1);
    expect([...base.leconsCochees("f")]).toEqual(["installer"]);
  });

  it("est idempotent quand il n'y a rien à supprimer", () => {
    expect(base.reinitialiser("vide")).toBe(0);
    expect(base.nettoyerOrphelines("vide", new Set())).toBe(0);
  });
});

describe("calculerAvancement (C-R2, P-R3, P-R4)", () => {
  it("propose « commencer » sur une formation vierge", () => {
    const avancement = calculerAvancement(manifeste, new Set());
    expect(avancement).toMatchObject({ faites: 0, total: 3, pourcentage: 0, action: "commencer" });
    expect(avancement.prochaine?.id).toBe("installer");
  });

  it("reprend à la première leçon non cochée dans l'ordre du manifeste", () => {
    const avancement = calculerAvancement(manifeste, new Set(["installer"]));
    expect(avancement.action).toBe("reprendre");
    expect(avancement.prochaine).toEqual({
      id: "mode-plan",
      titre: "Le mode plan",
      moduleTitre: "Fondations",
    });
    expect(avancement.pourcentage).toBe(33);
  });

  it("passe à « revoir » et pointe la première leçon à 100 %", () => {
    const cochees = new Set(["installer", "mode-plan", "anatomie"]);
    const avancement = calculerAvancement(manifeste, cochees);
    expect(avancement).toMatchObject({ action: "revoir", pourcentage: 100 });
    expect(avancement.prochaine?.id).toBe("installer");
  });

  it("exclut les orphelines des calculs mais les signale", () => {
    const avancement = calculerAvancement(manifeste, new Set(["installer", "fantome"]));
    expect(avancement.faites).toBe(1);
    expect(avancement.total).toBe(3);
    expect(avancement.orphelines).toEqual(["fantome"]);
  });

  it("détaille la progression par module", () => {
    const avancement = calculerAvancement(manifeste, new Set(["installer"]));
    expect(avancement.modules[0]).toMatchObject({ id: "fondations", faites: 1, total: 2 });
    expect(avancement.modules[1]).toMatchObject({ id: "skills", faites: 0, total: 1 });
  });

  it("ne change pas de clé quand le titre d'une leçon change (P-R2)", () => {
    const renomme: Manifeste = structuredClone(manifeste);
    renomme.modules[0]!.lecons[0]!.titre = "Installer Claude Code (v2)";
    const avancement = calculerAvancement(renomme, new Set(["installer"]));
    expect(avancement.faites).toBe(1);
    expect(avancement.orphelines).toEqual([]);
  });

  it("ne change pas de progression quand l'ordre des leçons change (P-R2)", () => {
    const reordonne: Manifeste = structuredClone(manifeste);
    reordonne.modules[0]!.lecons.reverse();
    const avancement = calculerAvancement(reordonne, new Set(["installer"]));
    expect(avancement.faites).toBe(1);
    expect(avancement.prochaine?.id).toBe("mode-plan");
  });
});

describe("voisines (U-R3)", () => {
  it("donne la précédente et la suivante à travers les modules", () => {
    expect(voisines(manifeste, "mode-plan")).toMatchObject({
      precedente: { id: "installer" },
      suivante: { id: "anatomie" },
    });
  });

  it("n'a pas de suivante sur la dernière leçon", () => {
    expect(voisines(manifeste, "anatomie").suivante).toBeNull();
  });

  it("n'a pas de précédente sur la première leçon", () => {
    expect(voisines(manifeste, "installer").precedente).toBeNull();
  });
});
