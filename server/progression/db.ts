import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS progression (
  formation_id TEXT NOT NULL,
  lecon_id     TEXT NOT NULL,
  coche_le     TEXT NOT NULL,
  PRIMARY KEY (formation_id, lecon_id)
);
CREATE INDEX IF NOT EXISTS idx_progression_formation
  ON progression (formation_id);
`;

export interface LigneProgression {
  formationId: string;
  leconId: string;
  cocheLe: string;
}

/**
 * Base de progression locale (P-R1, P-R6). Seule chose que Parcours écrit :
 * les dossiers de formation restent en lecture seule.
 */
export class BaseProgression {
  /** Vrai si la base a été réinitialisée au démarrage (bandeau UI, P-R1). */
  readonly reinitialisee: boolean;
  readonly sauvegardeCorrompue: string | null;

  private constructor(
    private readonly db: Database.Database,
    reinitialisee: boolean,
    sauvegardeCorrompue: string | null,
  ) {
    this.reinitialisee = reinitialisee;
    this.sauvegardeCorrompue = sauvegardeCorrompue;
  }

  /**
   * Ouvre (ou crée) la base. Base illisible ou corrompue → renommée
   * `parcours.db.corrupt-<horodatage>`, base neuve créée, jamais de crash.
   */
  static ouvrir(chemin: string): BaseProgression {
    fs.mkdirSync(path.dirname(chemin), { recursive: true });
    try {
      return new BaseProgression(preparer(chemin), false, null);
    } catch {
      const sauvegarde = `${chemin}.corrupt-${horodatage()}`;
      try {
        if (fs.existsSync(chemin)) fs.renameSync(chemin, sauvegarde);
        for (const suffixe of ["-wal", "-shm"]) {
          if (fs.existsSync(chemin + suffixe)) fs.rmSync(chemin + suffixe);
        }
      } catch {
        // Impossible de sauvegarder : on repart quand même sur une base neuve.
      }
      return new BaseProgression(preparer(chemin), true, sauvegarde);
    }
  }

  /** Cocher une leçon — idempotent (P-R2). */
  cocher(formationId: string, leconId: string, date = new Date()): void {
    this.db
      .prepare(
        `INSERT INTO progression (formation_id, lecon_id, coche_le)
         VALUES (?, ?, ?)
         ON CONFLICT (formation_id, lecon_id) DO NOTHING`,
      )
      .run(formationId, leconId, date.toISOString());
  }

  /** Décocher supprime la ligne — idempotent (P-R2). */
  decocher(formationId: string, leconId: string): void {
    this.db
      .prepare("DELETE FROM progression WHERE formation_id = ? AND lecon_id = ?")
      .run(formationId, leconId);
  }

  /** Ids des leçons cochées d'une formation, orphelines comprises. */
  leconsCochees(formationId: string): Set<string> {
    const lignes = this.db
      .prepare<[string], { lecon_id: string }>(
        "SELECT lecon_id FROM progression WHERE formation_id = ?",
      )
      .all(formationId);
    return new Set(lignes.map((ligne) => ligne.lecon_id));
  }

  /** Toutes les progressions, pour le catalogue (une seule requête). */
  toutesLesCoches(): Map<string, Set<string>> {
    const lignes = this.db
      .prepare<[], { formation_id: string; lecon_id: string }>(
        "SELECT formation_id, lecon_id FROM progression",
      )
      .all();
    const parFormation = new Map<string, Set<string>>();
    for (const ligne of lignes) {
      const existant = parFormation.get(ligne.formation_id) ?? new Set<string>();
      existant.add(ligne.lecon_id);
      parFormation.set(ligne.formation_id, existant);
    }
    return parFormation;
  }

  /** Réinitialise une formation, orphelines incluses (P-R5). */
  reinitialiser(formationId: string): number {
    return this.db
      .prepare("DELETE FROM progression WHERE formation_id = ?")
      .run(formationId).changes;
  }

  /** Purge les seules leçons qui ne sont plus au programme (P-R4). */
  nettoyerOrphelines(formationId: string, idsConnus: ReadonlySet<string>): number {
    const cochees = this.leconsCochees(formationId);
    const orphelines = [...cochees].filter((id) => !idsConnus.has(id));
    if (orphelines.length === 0) return 0;
    const suppression = this.db.prepare(
      "DELETE FROM progression WHERE formation_id = ? AND lecon_id = ?",
    );
    const transaction = this.db.transaction((ids: string[]) => {
      for (const id of ids) suppression.run(formationId, id);
    });
    transaction(orphelines);
    return orphelines.length;
  }

  fermer(): void {
    this.db.close();
  }
}

function preparer(chemin: string): Database.Database {
  const db = new Database(chemin);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  // Touche réellement le fichier : une base corrompue échoue ici, pas plus tard.
  db.prepare("SELECT count(*) FROM sqlite_master").get();
  db.exec(SCHEMA);
  return db;
}

function horodatage(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
