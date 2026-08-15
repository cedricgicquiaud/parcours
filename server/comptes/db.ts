import crypto from "node:crypto";
import type Database from "better-sqlite3";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS utilisateurs (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  identifiant        TEXT NOT NULL UNIQUE,
  nom                TEXT NOT NULL,
  empreinte          TEXT NOT NULL,
  role               TEXT NOT NULL CHECK (role IN ('admin', 'lecteur')),
  actif              INTEGER NOT NULL DEFAULT 1,
  cree_le            TEXT NOT NULL,
  derniere_connexion TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  jeton_hache    TEXT PRIMARY KEY,
  utilisateur_id INTEGER NOT NULL,
  cree_le        TEXT NOT NULL,
  expire_le      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_utilisateur ON sessions (utilisateur_id);
CREATE TABLE IF NOT EXISTS tentatives (
  identifiant TEXT NOT NULL,
  tentee_le   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tentatives ON tentatives (identifiant, tentee_le);
`;

export type Role = "admin" | "lecteur";

/** Un compte tel qu'exposé par l'API — sans empreinte, jamais (CO-R10). */
export interface Compte {
  id: number;
  identifiant: string;
  nom: string;
  role: Role;
  actif: boolean;
  creeLe: string;
  derniereConnexion: string | null;
}

interface LigneUtilisateur {
  id: number;
  identifiant: string;
  nom: string;
  empreinte: string;
  role: Role;
  actif: number;
  cree_le: string;
  derniere_connexion: string | null;
}

/** Durée de vie d'une session (AU-R3). */
export const DUREE_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
/** Fenêtre et seuil de l'anti-force brute (AU-R5). */
export const FENETRE_TENTATIVES_MS = 15 * 60 * 1000;
export const MAX_TENTATIVES = 10;

const OCTETS_JETON = 32;
const LONGUEUR_MIN_IDENTIFIANT = 3;
const LONGUEUR_MAX_IDENTIFIANT = 64;
const LONGUEUR_MAX_NOM = 120;

/** Le jeton de session ne vit en clair que dans le cookie du client (AU-R3). */
export function hacherJeton(jeton: string): string {
  return crypto.createHash("sha256").update(jeton).digest("hex");
}

/** Normalise un identifiant de connexion : casse et espaces n'y comptent pas. */
export function normaliserIdentifiant(valeur: string): string {
  return valeur.trim().toLowerCase().normalize("NFC");
}

export type Validation<T> = { ok: true; valeur: T } | { ok: false; erreur: string };

export function verifierIdentifiant(valeur: unknown): Validation<string> {
  if (typeof valeur !== "string") return { ok: false, erreur: "identifiant : texte attendu" };
  const normalise = normaliserIdentifiant(valeur);
  if (normalise.length < LONGUEUR_MIN_IDENTIFIANT) {
    return {
      ok: false,
      erreur: `identifiant trop court : ${LONGUEUR_MIN_IDENTIFIANT} caractères au minimum`,
    };
  }
  if (normalise.length > LONGUEUR_MAX_IDENTIFIANT) {
    return { ok: false, erreur: "identifiant trop long" };
  }
  // Ni espace ni caractère de contrôle : l'identifiant se tape et se compare.
  if (/[\s\u0000-\u001f\u007f]/.test(normalise)) {
    return { ok: false, erreur: "identifiant : espaces et caractères de contrôle interdits" };
  }
  return { ok: true, valeur: normalise };
}

export function verifierNom(valeur: unknown): Validation<string> {
  if (typeof valeur !== "string") return { ok: false, erreur: "nom : texte attendu" };
  const propre = valeur.trim().replace(/\s+/g, " ");
  if (propre.length === 0) return { ok: false, erreur: "nom : texte non vide attendu" };
  if (propre.length > LONGUEUR_MAX_NOM) return { ok: false, erreur: "nom trop long" };
  return { ok: true, valeur: propre };
}

/**
 * Comptes, sessions et tentatives de connexion (P011). La table `utilisateurs`
 * ne sort jamais telle quelle : `Compte` omet l'empreinte par construction.
 */
export class BaseComptes {
  constructor(private readonly db: Database.Database) {
    db.exec(SCHEMA);
    this.purgerSessionsExpirees();
  }

  // --- Comptes ---

  nombreDeComptes(): number {
    return (
      this.db
        .prepare<[], { total: number }>("SELECT count(*) AS total FROM utilisateurs")
        .get()?.total ?? 0
    );
  }

  /** Vrai tant qu'aucun compte n'existe : l'installation est requise (AU-R1). */
  installationRequise(): boolean {
    return this.nombreDeComptes() === 0;
  }

  creer(saisie: {
    identifiant: string;
    nom: string;
    empreinte: string;
    role: Role;
    date?: Date;
  }): Validation<Compte> {
    const date = (saisie.date ?? new Date()).toISOString();
    try {
      const resultat = this.db
        .prepare(
          `INSERT INTO utilisateurs (identifiant, nom, empreinte, role, actif, cree_le)
           VALUES (?, ?, ?, ?, 1, ?)`,
        )
        .run(saisie.identifiant, saisie.nom, saisie.empreinte, saisie.role, date);
      const compte = this.parId(Number(resultat.lastInsertRowid));
      if (!compte) return { ok: false, erreur: "création impossible" };
      return { ok: true, valeur: compte };
    } catch (erreur) {
      if (String((erreur as Error).message).includes("UNIQUE")) {
        return { ok: false, erreur: `l'identifiant « ${saisie.identifiant} » est déjà pris` };
      }
      throw erreur;
    }
  }

  parId(id: number): Compte | null {
    const ligne = this.ligneParId(id);
    return ligne ? enCompte(ligne) : null;
  }

  /** Empreinte comprise : réservé à la vérification du mot de passe. */
  ligneParIdentifiant(identifiant: string): LigneUtilisateur | undefined {
    return this.db
      .prepare<[string], LigneUtilisateur>(
        "SELECT * FROM utilisateurs WHERE identifiant = ?",
      )
      .get(normaliserIdentifiant(identifiant));
  }

  ligneParId(id: number): LigneUtilisateur | undefined {
    return this.db
      .prepare<[number], LigneUtilisateur>("SELECT * FROM utilisateurs WHERE id = ?")
      .get(id);
  }

  lister(): Compte[] {
    return this.db
      .prepare<[], LigneUtilisateur>(
        "SELECT * FROM utilisateurs ORDER BY role = 'lecteur', identifiant",
      )
      .all()
      .map(enCompte);
  }

  /** Nombre d'administrateurs encore actifs — garde-fou CO-R7. */
  nombreAdminsActifs(): number {
    return (
      this.db
        .prepare<[], { total: number }>(
          "SELECT count(*) AS total FROM utilisateurs WHERE role = 'admin' AND actif = 1",
        )
        .get()?.total ?? 0
    );
  }

  renommer(id: number, nom: string): void {
    this.db.prepare("UPDATE utilisateurs SET nom = ? WHERE id = ?").run(nom, id);
  }

  changerIdentifiant(id: number, identifiant: string): Validation<null> {
    try {
      this.db
        .prepare("UPDATE utilisateurs SET identifiant = ? WHERE id = ?")
        .run(identifiant, id);
      return { ok: true, valeur: null };
    } catch (erreur) {
      if (String((erreur as Error).message).includes("UNIQUE")) {
        return { ok: false, erreur: `l'identifiant « ${identifiant} » est déjà pris` };
      }
      throw erreur;
    }
  }

  changerRole(id: number, role: Role): void {
    this.db.prepare("UPDATE utilisateurs SET role = ? WHERE id = ?").run(role, id);
  }

  changerEmpreinte(id: number, empreinte: string): void {
    this.db
      .prepare("UPDATE utilisateurs SET empreinte = ? WHERE id = ?")
      .run(empreinte, id);
  }

  /** Désactiver révoque les sessions sur-le-champ (CO-R9). */
  changerActivation(id: number, actif: boolean): void {
    this.db
      .prepare("UPDATE utilisateurs SET actif = ? WHERE id = ?")
      .run(actif ? 1 : 0, id);
    if (!actif) this.revoquerSessionsDe(id);
  }

  supprimer(id: number): void {
    this.revoquerSessionsDe(id);
    this.db.prepare("DELETE FROM utilisateurs WHERE id = ?").run(id);
  }

  marquerConnexion(id: number, date = new Date()): void {
    this.db
      .prepare("UPDATE utilisateurs SET derniere_connexion = ? WHERE id = ?")
      .run(date.toISOString(), id);
  }

  // --- Sessions (AU-R3) ---

  /** Crée une session et rend le jeton EN CLAIR : il n'est stocké que haché. */
  ouvrirSession(utilisateurId: number, maintenant = new Date()): string {
    const jeton = crypto.randomBytes(OCTETS_JETON).toString("base64url");
    this.db
      .prepare(
        "INSERT INTO sessions (jeton_hache, utilisateur_id, cree_le, expire_le) VALUES (?, ?, ?, ?)",
      )
      .run(
        hacherJeton(jeton),
        utilisateurId,
        maintenant.toISOString(),
        new Date(maintenant.getTime() + DUREE_SESSION_MS).toISOString(),
      );
    return jeton;
  }

  /** Compte d'une session valide, ou `null`. Un compte désactivé n'en a pas. */
  compteDeSession(jeton: string, maintenant = new Date()): Compte | null {
    const ligne = this.db
      .prepare<[string, string], { utilisateur_id: number; expire_le: string }>(
        "SELECT utilisateur_id, expire_le FROM sessions WHERE jeton_hache = ? AND expire_le > ?",
      )
      .get(hacherJeton(jeton), maintenant.toISOString());
    if (!ligne) return null;

    const compte = this.parId(ligne.utilisateur_id);
    if (!compte || !compte.actif) return null;
    return compte;
  }

  /** Prolonge une session dont plus de la moitié de la durée est écoulée (AU-R3). */
  prolongerSiNecessaire(jeton: string, maintenant = new Date()): boolean {
    const ligne = this.db
      .prepare<[string], { expire_le: string }>(
        "SELECT expire_le FROM sessions WHERE jeton_hache = ?",
      )
      .get(hacherJeton(jeton));
    if (!ligne) return false;

    const restant = new Date(ligne.expire_le).getTime() - maintenant.getTime();
    if (restant > DUREE_SESSION_MS / 2) return false;

    this.db
      .prepare("UPDATE sessions SET expire_le = ? WHERE jeton_hache = ?")
      .run(
        new Date(maintenant.getTime() + DUREE_SESSION_MS).toISOString(),
        hacherJeton(jeton),
      );
    return true;
  }

  fermerSession(jeton: string): void {
    this.db.prepare("DELETE FROM sessions WHERE jeton_hache = ?").run(hacherJeton(jeton));
  }

  revoquerSessionsDe(utilisateurId: number): number {
    return this.db
      .prepare("DELETE FROM sessions WHERE utilisateur_id = ?")
      .run(utilisateurId).changes;
  }

  /** Révoque toutes les sessions d'un compte SAUF celle en cours (CO-R4). */
  revoquerAutresSessions(utilisateurId: number, jetonGarde: string): number {
    return this.db
      .prepare("DELETE FROM sessions WHERE utilisateur_id = ? AND jeton_hache <> ?")
      .run(utilisateurId, hacherJeton(jetonGarde)).changes;
  }

  purgerSessionsExpirees(maintenant = new Date()): number {
    return this.db
      .prepare("DELETE FROM sessions WHERE expire_le <= ?")
      .run(maintenant.toISOString()).changes;
  }

  // --- Tentatives de connexion (AU-R5) ---

  enregistrerEchec(identifiant: string, maintenant = new Date()): void {
    this.db
      .prepare("INSERT INTO tentatives (identifiant, tentee_le) VALUES (?, ?)")
      .run(normaliserIdentifiant(identifiant), maintenant.toISOString());
  }

  effacerEchecs(identifiant: string): void {
    this.db
      .prepare("DELETE FROM tentatives WHERE identifiant = ?")
      .run(normaliserIdentifiant(identifiant));
  }

  /** Nombre d'échecs sur la fenêtre glissante, anciens purgés au passage. */
  echecsRecents(identifiant: string, maintenant = new Date()): number {
    const debut = new Date(maintenant.getTime() - FENETRE_TENTATIVES_MS).toISOString();
    this.db.prepare("DELETE FROM tentatives WHERE tentee_le <= ?").run(debut);
    return (
      this.db
        .prepare<[string, string], { total: number }>(
          "SELECT count(*) AS total FROM tentatives WHERE identifiant = ? AND tentee_le > ?",
        )
        .get(normaliserIdentifiant(identifiant), debut)?.total ?? 0
    );
  }

  estBloque(identifiant: string, maintenant = new Date()): boolean {
    return this.echecsRecents(identifiant, maintenant) >= MAX_TENTATIVES;
  }
}

function enCompte(ligne: LigneUtilisateur): Compte {
  return {
    id: ligne.id,
    identifiant: ligne.identifiant,
    nom: ligne.nom,
    role: ligne.role,
    actif: ligne.actif === 1,
    creeLe: ligne.cree_le,
    derniereConnexion: ligne.derniere_connexion,
  };
}
