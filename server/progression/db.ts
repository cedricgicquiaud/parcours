import type Database from "better-sqlite3";
import { colonnesDe, ouvrirBase, tableExiste } from "../base";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS progression (
  utilisateur_id INTEGER NOT NULL,
  formation_id   TEXT NOT NULL,
  lecon_id       TEXT NOT NULL,
  coche_le       TEXT NOT NULL,
  PRIMARY KEY (utilisateur_id, formation_id, lecon_id)
);
CREATE INDEX IF NOT EXISTS idx_progression_formation
  ON progression (utilisateur_id, formation_id);
`;

/**
 * Progression d'avant les comptes (P002) : elle n'avait pas de propriétaire.
 * Elle est conservée sous cet identifiant sentinelle jusqu'à ce que le premier
 * administrateur soit créé, qui l'hérite (CO-R3).
 */
export const UTILISATEUR_HERITE = 0;

export interface LigneProgression {
  formationId: string;
  leconId: string;
  cocheLe: string;
}

/**
 * Base de progression locale (P-R1, P-R6), rattachée à un compte depuis P011.
 */
export class BaseProgression {
  constructor(
    private readonly db: Database.Database,
    readonly reinitialisee = false,
    readonly sauvegardeCorrompue: string | null = null,
  ) {
    migrer(db);
    db.exec(SCHEMA);
  }

  /** Ouvre une base autonome — utilisé par les tests et les outils. */
  static ouvrir(chemin: string): BaseProgression {
    const ouverte = ouvrirBase(chemin);
    return new BaseProgression(
      ouverte.db,
      ouverte.reinitialisee,
      ouverte.sauvegardeCorrompue,
    );
  }

  /** Connexion partagée avec les autres tables de la base. */
  get connexion(): Database.Database {
    return this.db;
  }

  /** Cocher une leçon — idempotent (P-R2). */
  cocher(
    utilisateurId: number,
    formationId: string,
    leconId: string,
    date = new Date(),
  ): void {
    this.db
      .prepare(
        `INSERT INTO progression (utilisateur_id, formation_id, lecon_id, coche_le)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (utilisateur_id, formation_id, lecon_id) DO NOTHING`,
      )
      .run(utilisateurId, formationId, leconId, date.toISOString());
  }

  /** Décocher supprime la ligne — idempotent (P-R2). */
  decocher(utilisateurId: number, formationId: string, leconId: string): void {
    this.db
      .prepare(
        "DELETE FROM progression WHERE utilisateur_id = ? AND formation_id = ? AND lecon_id = ?",
      )
      .run(utilisateurId, formationId, leconId);
  }

  /** Ids des leçons cochées d'une formation, orphelines comprises. */
  leconsCochees(utilisateurId: number, formationId: string): Set<string> {
    const lignes = this.db
      .prepare<[number, string], { lecon_id: string }>(
        "SELECT lecon_id FROM progression WHERE utilisateur_id = ? AND formation_id = ?",
      )
      .all(utilisateurId, formationId);
    return new Set(lignes.map((ligne) => ligne.lecon_id));
  }

  /** Toutes les progressions d'un compte, pour le catalogue (une seule requête). */
  toutesLesCoches(utilisateurId: number): Map<string, Set<string>> {
    const lignes = this.db
      .prepare<[number], { formation_id: string; lecon_id: string }>(
        "SELECT formation_id, lecon_id FROM progression WHERE utilisateur_id = ?",
      )
      .all(utilisateurId);
    const parFormation = new Map<string, Set<string>>();
    for (const ligne of lignes) {
      const existant = parFormation.get(ligne.formation_id) ?? new Set<string>();
      existant.add(ligne.lecon_id);
      parFormation.set(ligne.formation_id, existant);
    }
    return parFormation;
  }

  /** Réinitialise une formation pour un compte, orphelines incluses (P-R5). */
  reinitialiser(utilisateurId: number, formationId: string): number {
    return this.db
      .prepare("DELETE FROM progression WHERE utilisateur_id = ? AND formation_id = ?")
      .run(utilisateurId, formationId).changes;
  }

  /** Purge les seules leçons qui ne sont plus au programme (P-R4). */
  nettoyerOrphelines(
    utilisateurId: number,
    formationId: string,
    idsConnus: ReadonlySet<string>,
  ): number {
    const cochees = this.leconsCochees(utilisateurId, formationId);
    const orphelines = [...cochees].filter((id) => !idsConnus.has(id));
    if (orphelines.length === 0) return 0;
    const suppression = this.db.prepare(
      "DELETE FROM progression WHERE utilisateur_id = ? AND formation_id = ? AND lecon_id = ?",
    );
    const transaction = this.db.transaction((ids: string[]) => {
      for (const id of ids) suppression.run(utilisateurId, formationId, id);
    });
    transaction(orphelines);
    return orphelines.length;
  }

  /** Attribue la progression d'avant les comptes au premier admin (CO-R3). */
  adopterProgressionHeritee(utilisateurId: number): number {
    return this.db
      .prepare("UPDATE progression SET utilisateur_id = ? WHERE utilisateur_id = ?")
      .run(utilisateurId, UTILISATEUR_HERITE).changes;
  }

  /** Efface toute la progression d'un compte supprimé (CO-R8). */
  effacerCompte(utilisateurId: number): number {
    return this.db
      .prepare("DELETE FROM progression WHERE utilisateur_id = ?")
      .run(utilisateurId).changes;
  }

  fermer(): void {
    this.db.close();
  }
}

/**
 * Migration de la table d'avant les comptes : la clé primaire change, ce que
 * SQLite ne sait pas faire en place — on recrée et on recopie. Les coches
 * existantes prennent l'identifiant sentinelle (CO-R3).
 */
function migrer(db: Database.Database): void {
  if (!tableExiste(db, "progression")) return;
  if (colonnesDe(db, "progression").has("utilisateur_id")) return;

  db.exec(`
    BEGIN;
    CREATE TABLE progression_migree (
      utilisateur_id INTEGER NOT NULL,
      formation_id   TEXT NOT NULL,
      lecon_id       TEXT NOT NULL,
      coche_le       TEXT NOT NULL,
      PRIMARY KEY (utilisateur_id, formation_id, lecon_id)
    );
    INSERT INTO progression_migree (utilisateur_id, formation_id, lecon_id, coche_le)
      SELECT ${UTILISATEUR_HERITE}, formation_id, lecon_id, coche_le FROM progression;
    DROP TABLE progression;
    ALTER TABLE progression_migree RENAME TO progression;
    COMMIT;
  `);
}
