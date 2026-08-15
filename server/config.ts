import path from "node:path";
import os from "node:os";

/** Port unique du serveur Parcours (A-R1 : jamais autre chose que 127.0.0.1). */
export const PORT = 4620;
export const HOTE = "127.0.0.1";

/** Racine du dépôt, déduite de l'emplacement de ce fichier (server/config.ts). */
export const RACINE_PROJET = path.resolve(import.meta.dirname, "..");

/**
 * Dossier des formations (F-R1) : `formations/` à la racine, surchargeable par
 * PARCOURS_FORMATIONS_DIR — la seule configuration admise par le PRD.
 */
export function dossierFormations(env: NodeJS.ProcessEnv = process.env): string {
  const surcharge = env.PARCOURS_FORMATIONS_DIR?.trim();
  if (surcharge) return path.resolve(surcharge);
  return path.join(RACINE_PROJET, "formations");
}

/** Emplacement de la base de progression (P-R1). */
export function cheminBaseProgression(env: NodeJS.ProcessEnv = process.env): string {
  const surcharge = env.PARCOURS_DB_PATH?.trim();
  if (surcharge) return path.resolve(surcharge);
  return path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "Parcours",
    "parcours.db",
  );
}
