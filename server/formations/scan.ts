import fs from "node:fs/promises";
import path from "node:path";
import {
  analyserJson,
  cheminConfine,
  leconsOrdonnees,
  validerManifeste,
  type Manifeste,
} from "./manifeste";

/** Taille maximale d'un fichier de leçon (F-R5). */
export const TAILLE_MAX_LECON = 2_000_000;

export interface FormationValide {
  statut: "valide";
  id: string;
  dossier: string;
  manifeste: Manifeste;
}

export interface FormationInvalide {
  statut: "invalide";
  id: string;
  dossier: string;
  erreur: string;
}

export type Formation = FormationValide | FormationInvalide;

export interface ResultatScan {
  formations: Formation[];
  /** Erreur globale au niveau du dossier de formations lui-même (F-R1). */
  erreurGlobale?: string;
}

async function existe(chemin: string): Promise<boolean> {
  try {
    await fs.access(chemin);
    return true;
  } catch {
    return false;
  }
}

/** Vérifie l'existence des fichiers de leçons — sans les lire (C-R1, F-R5). */
async function verifierFichiers(
  manifeste: Manifeste,
  dossier: string,
): Promise<string | null> {
  for (const { lecon } of leconsOrdonnees(manifeste)) {
    const confine = cheminConfine(lecon.fichier);
    if (!confine.ok) return confine.erreur;
    const complet = path.join(dossier, confine.valeur);
    if (!(await existe(complet))) return `fichier introuvable : ${lecon.fichier}`;
  }
  return null;
}

/** Scanne un dossier de formation unique (C-R3, C-R4, C-R5). */
export async function scannerFormation(dossier: string): Promise<Formation | null> {
  const id = path.basename(dossier);
  let entrees: string[];
  try {
    entrees = await fs.readdir(dossier);
  } catch {
    return { statut: "invalide", id, dossier, erreur: "dossier illisible" };
  }

  // C-R4 : un dossier vide est ignoré sans erreur.
  if (entrees.length === 0) return null;

  const cheminManifeste = path.join(dossier, "formation.json");
  let texte: string;
  try {
    const infos = await fs.stat(cheminManifeste);
    if (!infos.isFile()) throw new Error("pas un fichier");
    texte = await fs.readFile(cheminManifeste, "utf8");
  } catch {
    return { statut: "invalide", id, dossier, erreur: "formation.json manquant" };
  }

  const json = analyserJson(texte);
  if (!json.ok) return { statut: "invalide", id, dossier, erreur: json.erreur };

  const valide = validerManifeste(json.valeur, id);
  if (!valide.ok) return { statut: "invalide", id, dossier, erreur: valide.erreur };

  const erreurFichier = await verifierFichiers(valide.valeur, dossier);
  if (erreurFichier) {
    return { statut: "invalide", id, dossier, erreur: erreurFichier };
  }

  return { statut: "valide", id, dossier, manifeste: valide.valeur };
}

/**
 * Scan complet du dossier de formations, à chaque requête catalogue (C-R1).
 * Chemin inexistant, illisible ou pointant vers un fichier → catalogue vide et
 * erreur globale précisant la cause (F-R1) : jamais de crash.
 */
export async function scannerCatalogue(racine: string): Promise<ResultatScan> {
  let infos;
  try {
    infos = await fs.stat(racine);
  } catch (erreur) {
    const code = (erreur as NodeJS.ErrnoException).code;
    const cause =
      code === "ENOENT" ? "dossier introuvable" : `dossier illisible (${code})`;
    return { formations: [], erreurGlobale: `${cause} : ${racine}` };
  }
  if (!infos.isDirectory()) {
    return {
      formations: [],
      erreurGlobale: `le chemin de formations n'est pas un dossier : ${racine}`,
    };
  }

  let entrees;
  try {
    entrees = await fs.readdir(racine, { withFileTypes: true });
  } catch (erreur) {
    const code = (erreur as NodeJS.ErrnoException).code;
    return {
      formations: [],
      erreurGlobale: `dossier illisible (${code}) : ${racine}`,
    };
  }

  // C-R4 : fichiers isolés et dossiers cachés ignorés sans erreur.
  const candidats = entrees
    .filter((entree) => entree.isDirectory() && !entree.name.startsWith("."))
    .map((entree) => path.join(racine, entree.name))
    .sort((a, b) => a.localeCompare(b, "fr"));

  const scannees = await Promise.all(candidats.map(scannerFormation));
  return { formations: scannees.filter((f): f is Formation => f !== null) };
}

/**
 * Résolution d'un id de formation par correspondance EXACTE dans le résultat du
 * scan — jamais par accès direct au filesystem (A-R7).
 */
export function trouverFormation(
  scan: ResultatScan,
  fid: string,
): Formation | undefined {
  return scan.formations.find((formation) => formation.id === fid);
}

/** Résolution d'une leçon par id exact dans le manifeste (A-R7). */
export function trouverLecon(formation: FormationValide, lid: string) {
  return leconsOrdonnees(formation.manifeste).find(
    (entree) => entree.lecon.id === lid,
  );
}
