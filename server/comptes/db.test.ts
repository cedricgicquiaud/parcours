import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ouvrirBase } from "../base";
import { BaseProgression, UTILISATEUR_HERITE } from "../progression/db";
import {
  BaseComptes,
  DUREE_SESSION_MS,
  hacherJeton,
  MAX_TENTATIVES,
  normaliserIdentifiant,
  verifierIdentifiant,
  verifierNom,
} from "./db";

let dossier: string;
let comptes: BaseComptes;
let progression: BaseProgression;

beforeEach(() => {
  dossier = fs.mkdtempSync(path.join(os.tmpdir(), "parcours-comptes-"));
  const ouverte = ouvrirBase(path.join(dossier, "parcours.db"));
  progression = new BaseProgression(ouverte.db);
  comptes = new BaseComptes(ouverte.db);
});

afterEach(() => {
  progression.fermer();
  fs.rmSync(dossier, { recursive: true, force: true });
});

const creer = (identifiant: string, role: "admin" | "lecteur" = "lecteur") =>
  comptes.creer({
    identifiant,
    nom: identifiant,
    empreinte: "scrypt$16384$8$1$c2Vs$ZW1wcmVpbnRl",
    role,
  });

describe("validation des saisies", () => {
  it("normalise l'identifiant : casse et espaces ne comptent pas", () => {
    expect(normaliserIdentifiant("  Cedric  ")).toBe("cedric");
    expect(verifierIdentifiant(" Cedric ")).toEqual({ ok: true, valeur: "cedric" });
  });

  it("refuse un identifiant trop court, trop long ou avec un espace", () => {
    expect(verifierIdentifiant("ab")).toMatchObject({ ok: false });
    expect(verifierIdentifiant("a".repeat(65))).toMatchObject({ ok: false });
    expect(verifierIdentifiant("ce dric")).toMatchObject({ ok: false });
    expect(verifierIdentifiant(12)).toMatchObject({ ok: false });
  });

  it("accepte une adresse e-mail comme identifiant", () => {
    expect(verifierIdentifiant("Cedric@Exemple.fr")).toEqual({
      ok: true,
      valeur: "cedric@exemple.fr",
    });
  });

  it("resserre les espaces d'un nom et refuse le vide", () => {
    expect(verifierNom("  Cédric   Gicquiaud ")).toEqual({
      ok: true,
      valeur: "Cédric Gicquiaud",
    });
    expect(verifierNom("   ")).toMatchObject({ ok: false });
  });
});

describe("comptes (CO-R1, CO-R6)", () => {
  it("signale l'installation requise tant qu'aucun compte n'existe (AU-R1)", () => {
    expect(comptes.installationRequise()).toBe(true);
    creer("cedric", "admin");
    expect(comptes.installationRequise()).toBe(false);
  });

  it("n'expose jamais l'empreinte du mot de passe (CO-R10)", () => {
    const cree = creer("cedric", "admin");
    expect(cree.ok).toBe(true);
    if (!cree.ok) return;
    expect(Object.keys(cree.valeur)).not.toContain("empreinte");
    expect(JSON.stringify(comptes.lister())).not.toContain("scrypt");
  });

  it("refuse deux comptes de même identifiant", () => {
    creer("cedric");
    expect(creer("cedric")).toMatchObject({ ok: false });
  });

  it("compte les administrateurs encore actifs (CO-R7)", () => {
    const admin = creer("chef", "admin");
    creer("eleve");
    expect(comptes.nombreAdminsActifs()).toBe(1);
    if (!admin.ok) return;
    comptes.changerActivation(admin.valeur.id, false);
    expect(comptes.nombreAdminsActifs()).toBe(0);
  });

  it("liste les administrateurs en premier", () => {
    creer("zoe");
    creer("adele", "admin");
    expect(comptes.lister().map((compte) => compte.identifiant)).toEqual([
      "adele",
      "zoe",
    ]);
  });
});

describe("sessions (AU-R3, CO-R9)", () => {
  it("ne stocke le jeton que haché", () => {
    const compte = creer("cedric", "admin");
    if (!compte.ok) return;
    const jeton = comptes.ouvrirSession(compte.valeur.id);

    const contenu = fs.readFileSync(path.join(dossier, "parcours.db"), "latin1");
    expect(contenu).not.toContain(jeton);
    expect(comptes.compteDeSession(jeton)?.identifiant).toBe("cedric");
    expect(hacherJeton(jeton)).toHaveLength(64);
  });

  it("refuse un jeton inconnu ou expiré", () => {
    const compte = creer("cedric");
    if (!compte.ok) return;
    const jeton = comptes.ouvrirSession(compte.valeur.id, new Date(2020, 0, 1));

    expect(comptes.compteDeSession("jeton-inventé")).toBeNull();
    expect(comptes.compteDeSession(jeton)).toBeNull();
  });

  it("ferme la session à la déconnexion", () => {
    const compte = creer("cedric");
    if (!compte.ok) return;
    const jeton = comptes.ouvrirSession(compte.valeur.id);
    comptes.fermerSession(jeton);
    expect(comptes.compteDeSession(jeton)).toBeNull();
  });

  it("invalide immédiatement les sessions d'un compte désactivé (CO-R9)", () => {
    const compte = creer("cedric");
    if (!compte.ok) return;
    const jeton = comptes.ouvrirSession(compte.valeur.id);
    comptes.changerActivation(compte.valeur.id, false);
    expect(comptes.compteDeSession(jeton)).toBeNull();
  });

  it("prolonge une session à mi-parcours, pas avant", () => {
    const compte = creer("cedric");
    if (!compte.ok) return;
    const debut = new Date(2026, 0, 1);
    const jeton = comptes.ouvrirSession(compte.valeur.id, debut);

    expect(comptes.prolongerSiNecessaire(jeton, debut)).toBe(false);
    const tard = new Date(debut.getTime() + DUREE_SESSION_MS * 0.75);
    expect(comptes.prolongerSiNecessaire(jeton, tard)).toBe(true);
    expect(comptes.compteDeSession(jeton, tard)).not.toBeNull();
  });

  it("révoque les autres sessions en gardant celle en cours (CO-R4)", () => {
    const compte = creer("cedric");
    if (!compte.ok) return;
    const ancienne = comptes.ouvrirSession(compte.valeur.id);
    const courante = comptes.ouvrirSession(compte.valeur.id);

    expect(comptes.revoquerAutresSessions(compte.valeur.id, courante)).toBe(1);
    expect(comptes.compteDeSession(ancienne)).toBeNull();
    expect(comptes.compteDeSession(courante)).not.toBeNull();
  });
});

describe("anti-force brute (AU-R5)", () => {
  it("bloque après le seuil d'échecs, sur une fenêtre glissante", () => {
    for (let essai = 0; essai < MAX_TENTATIVES - 1; essai++) {
      comptes.enregistrerEchec("cedric");
    }
    expect(comptes.estBloque("cedric")).toBe(false);
    comptes.enregistrerEchec("cedric");
    expect(comptes.estBloque("cedric")).toBe(true);
    // Un autre identifiant n'est pas pénalisé.
    expect(comptes.estBloque("quelquun-dautre")).toBe(false);
  });

  it("oublie les échecs sortis de la fenêtre", () => {
    const vieux = new Date(Date.now() - 60 * 60 * 1000);
    for (let essai = 0; essai < MAX_TENTATIVES; essai++) {
      comptes.enregistrerEchec("cedric", vieux);
    }
    expect(comptes.estBloque("cedric")).toBe(false);
  });

  it("efface le compteur après une connexion réussie", () => {
    for (let essai = 0; essai < MAX_TENTATIVES; essai++) comptes.enregistrerEchec("cedric");
    comptes.effacerEchecs("cedric");
    expect(comptes.estBloque("cedric")).toBe(false);
  });
});

describe("progression par utilisateur (CO-R3)", () => {
  it("garde les progressions de deux comptes séparées", () => {
    progression.cocher(1, "formation", "lecon-a");
    progression.cocher(2, "formation", "lecon-b");

    expect([...progression.leconsCochees(1, "formation")]).toEqual(["lecon-a"]);
    expect([...progression.leconsCochees(2, "formation")]).toEqual(["lecon-b"]);
    expect(progression.toutesLesCoches(1).get("formation")?.size).toBe(1);
  });

  it("n'efface que la progression du compte visé", () => {
    progression.cocher(1, "formation", "lecon-a");
    progression.cocher(2, "formation", "lecon-a");

    expect(progression.reinitialiser(1, "formation")).toBe(1);
    expect(progression.leconsCochees(2, "formation").size).toBe(1);
  });

  it("efface toute la progression d'un compte supprimé (CO-R8)", () => {
    progression.cocher(1, "a", "x");
    progression.cocher(1, "b", "y");
    progression.cocher(2, "a", "x");

    expect(progression.effacerCompte(1)).toBe(2);
    expect(progression.leconsCochees(2, "a").size).toBe(1);
  });

  it("attribue au premier admin la progression d'avant les comptes", () => {
    progression.cocher(UTILISATEUR_HERITE, "formation", "lecon-a");
    expect(progression.adopterProgressionHeritee(7)).toBe(1);
    expect([...progression.leconsCochees(7, "formation")]).toEqual(["lecon-a"]);
  });
});

describe("migration d'une base d'avant les comptes", () => {
  it("conserve les coches existantes en les marquant héritées", () => {
    const chemin = path.join(dossier, "ancienne.db");
    const ancienne = ouvrirBase(chemin);
    ancienne.db.exec(`
      CREATE TABLE progression (
        formation_id TEXT NOT NULL,
        lecon_id     TEXT NOT NULL,
        coche_le     TEXT NOT NULL,
        PRIMARY KEY (formation_id, lecon_id)
      );
      INSERT INTO progression VALUES ('prise-en-main', 'bienvenue', '2026-08-01T10:00:00Z');
    `);
    ancienne.db.close();

    const reouverte = ouvrirBase(chemin);
    const base = new BaseProgression(reouverte.db);
    expect([...base.leconsCochees(UTILISATEUR_HERITE, "prise-en-main")]).toEqual([
      "bienvenue",
    ]);
    base.adopterProgressionHeritee(1);
    expect([...base.leconsCochees(1, "prise-en-main")]).toEqual(["bienvenue"]);
    base.fermer();
  });
});
