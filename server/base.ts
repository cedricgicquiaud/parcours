import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export interface BaseOuverte {
  db: Database.Database;
  /** Vrai si la base a été trouvée corrompue et repartie de zéro (P-R1). */
  reinitialisee: boolean;
  sauvegardeCorrompue: string | null;
}

/**
 * Ouvre l'unique base locale de Parcours — progression et comptes partagent la
 * même connexion. Base illisible ou corrompue → renommée
 * `parcours.db.corrupt-<horodatage>`, base neuve créée, jamais de crash (P-R1).
 */
export function ouvrirBase(chemin: string): BaseOuverte {
  fs.mkdirSync(path.dirname(chemin), { recursive: true });
  try {
    return { db: preparer(chemin), reinitialisee: false, sauvegardeCorrompue: null };
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
    return {
      db: preparer(chemin),
      reinitialisee: true,
      sauvegardeCorrompue: sauvegarde,
    };
  }
}

function preparer(chemin: string): Database.Database {
  const db = new Database(chemin);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  // Touche réellement le fichier : une base corrompue échoue ici, pas plus tard.
  db.prepare("SELECT count(*) FROM sqlite_master").get();
  return db;
}

function horodatage(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

/** Vrai si la table existe déjà — utilisé par les migrations de schéma. */
export function tableExiste(db: Database.Database, nom: string): boolean {
  const ligne = db
    .prepare<[string], { nom: string }>(
      "SELECT name AS nom FROM sqlite_master WHERE type = 'table' AND name = ?",
    )
    .get(nom);
  return ligne !== undefined;
}

/**
 * Noms des colonnes d'une table existante. `PRAGMA` n'accepte pas de paramètre
 * lié : le nom est donc interpolé, et restreint ici aux identifiants simples
 * pour que cette fonction reste inoffensive même appelée avec une entrée tierce.
 */
export function colonnesDe(db: Database.Database, table: string): Set<string> {
  if (!/^[a-z_][a-z0-9_]*$/i.test(table)) {
    throw new Error(`nom de table invalide : ${table}`);
  }
  const lignes = db
    .prepare<[], { name: string }>(`PRAGMA table_info(${table})`)
    .all();
  return new Set(lignes.map((ligne) => ligne.name));
}
