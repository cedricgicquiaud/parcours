import fs from "node:fs/promises";
import path from "node:path";
import type { Validation } from "./manifeste";
import { leconsOrdonnees } from "./manifeste";
import { scannerFormation } from "./scan";

/**
 * Cycle de vie d'une formation (G-R1). Trois emplacements, un seul à la fois :
 * `formations/<id>` (active), `formations/.archives/<id>` (archivée),
 * `formations/.corbeille/<id>--<horodatage>` (en corbeille). Passer d'un état à
 * l'autre est toujours un DÉPLACEMENT de dossier — jamais une copie, jamais une
 * suppression (G-R9). Le scan ignorant les dossiers cachés, une formation
 * archivée ou en corbeille sort du catalogue sans filtrage supplémentaire.
 */
export const DOSSIER_ARCHIVES = ".archives";
export const DOSSIER_CORBEILLE = ".corbeille";

/** Sépare l'identifiant d'origine de son horodatage dans la corbeille. */
const SEPARATEUR = "--";
const NOM_CORBEILLE = /^(.+)--(\d{8}-\d{6})(?:-(\d+))?$/;

function echec(erreur: string): { ok: false; erreur: string } {
  return { ok: false, erreur };
}

/** Suffixe horodaté triable, sans caractère à échapper : `20260815-142530`. */
export function horodater(date: Date): string {
  const deux = (valeur: number) => String(valeur).padStart(2, "0");
  return [
    `${date.getFullYear()}${deux(date.getMonth() + 1)}${deux(date.getDate())}`,
    `${deux(date.getHours())}${deux(date.getMinutes())}${deux(date.getSeconds())}`,
  ].join("-");
}

export const cheminArchives = (racine: string) => path.join(racine, DOSSIER_ARCHIVES);
export const cheminCorbeille = (racine: string) => path.join(racine, DOSSIER_CORBEILLE);

async function existe(chemin: string): Promise<boolean> {
  try {
    await fs.access(chemin);
    return true;
  } catch {
    return false;
  }
}

/** Nom de dossier utilisable tel quel : ni chemin, ni remontée (A-R7). */
function nomSimple(valeur: string): boolean {
  return (
    valeur.length > 0 &&
    !valeur.startsWith(".") &&
    !valeur.includes("/") &&
    !valeur.includes("\\") &&
    valeur !== ".." &&
    path.basename(valeur) === valeur
  );
}

/**
 * Déplace un dossier vers un emplacement libre. La cible est vérifiée AVANT le
 * renommage : `fs.rename` écrase silencieusement un dossier vide.
 */
async function deplacer(source: string, cible: string): Promise<Validation<null>> {
  if (!(await existe(source))) {
    return echec(`dossier introuvable : ${path.basename(source)}`);
  }
  if (await existe(cible)) {
    return echec(`« ${path.basename(cible)} » existe déjà`);
  }
  await fs.mkdir(path.dirname(cible), { recursive: true });
  try {
    await fs.rename(source, cible);
  } catch (erreur) {
    return echec(`déplacement impossible : ${(erreur as Error).message}`);
  }
  return { ok: true, valeur: null };
}

/** Retire une formation du catalogue sans toucher à son contenu (G-R7). */
export async function archiver(racine: string, fid: string): Promise<Validation<null>> {
  if (!nomSimple(fid)) return echec(`identifiant invalide : ${fid}`);
  return deplacer(path.join(racine, fid), path.join(cheminArchives(racine), fid));
}

/** Remet une archive au catalogue, à l'identique (G-R7). */
export async function restaurerArchive(
  racine: string,
  fid: string,
): Promise<Validation<null>> {
  if (!nomSimple(fid)) return echec(`identifiant invalide : ${fid}`);
  const deplace = await deplacer(
    path.join(cheminArchives(racine), fid),
    path.join(racine, fid),
  );
  if (deplace.ok) await retirerSiVide(cheminArchives(racine));
  return deplace;
}

/** Retire l'emplacement technique quand il ne contient plus rien. */
async function retirerSiVide(dossier: string): Promise<void> {
  try {
    // `rmdir` sans `recursive` échoue si le dossier n'est pas vide : c'est la
    // garantie qu'aucun contenu n'est supprimé par ce nettoyage (G-R9).
    await fs.rmdir(dossier);
  } catch {
    // Non vide, ou déjà absent : rien à faire.
  }
}

export interface EntreeCorbeille {
  /** Nom du dossier dans la corbeille — la clé pour restaurer. */
  entree: string;
  id: string;
  titre: string | null;
  /** Date de mise en corbeille, au format ISO. */
  supprimeeLe: string;
}

/**
 * Déplace un dossier de formation dans la corbeille (G-R8). Le dossier source
 * peut être actif ou archivé : c'est son chemin complet qui est passé.
 */
export async function mettreEnCorbeille(
  racine: string,
  source: string,
  maintenant: Date = new Date(),
): Promise<Validation<{ entree: string }>> {
  const id = path.basename(source);
  if (!nomSimple(id)) return echec(`identifiant invalide : ${id}`);

  const base = `${id}${SEPARATEUR}${horodater(maintenant)}`;
  // Deux suppressions dans la même seconde ne doivent pas se recouvrir.
  let entree = base;
  let suffixe = 2;
  while (await existe(path.join(cheminCorbeille(racine), entree))) {
    entree = `${base}-${suffixe}`;
    suffixe += 1;
  }

  const deplace = await deplacer(source, path.join(cheminCorbeille(racine), entree));
  if (!deplace.ok) return deplace;
  return { ok: true, valeur: { entree } };
}

/** Remet une entrée de corbeille au catalogue (G-R8). */
export async function restaurerDeCorbeille(
  racine: string,
  entree: string,
): Promise<Validation<{ id: string }>> {
  if (!nomSimple(entree)) return echec(`entrée de corbeille invalide : ${entree}`);
  const correspondance = NOM_CORBEILLE.exec(entree);
  if (!correspondance) return echec(`entrée de corbeille inconnue : ${entree}`);

  const id = correspondance[1]!;
  const deplace = await deplacer(
    path.join(cheminCorbeille(racine), entree),
    path.join(racine, id),
  );
  if (!deplace.ok) return deplace;
  await retirerSiVide(cheminCorbeille(racine));
  return { ok: true, valeur: { id } };
}

export interface EntreeArchive {
  statut: "valide" | "invalide";
  id: string;
  titre?: string;
  lecons?: number;
  erreur?: string;
}

/** Sous-dossiers directs, triés — vide si l'emplacement n'existe pas encore. */
async function sousDossiers(racine: string): Promise<string[]> {
  try {
    const entrees = await fs.readdir(racine, { withFileTypes: true });
    return entrees
      .filter((entree) => entree.isDirectory())
      .map((entree) => entree.name)
      .sort((a, b) => a.localeCompare(b, "fr"));
  } catch {
    return [];
  }
}

/**
 * Liste les formations archivées. Une archive au manifeste cassé est signalée
 * avec son erreur plutôt que masquée (G-R10, F-R1).
 */
export async function listerArchives(racine: string): Promise<EntreeArchive[]> {
  const noms = await sousDossiers(cheminArchives(racine));
  const scannees = await Promise.all(
    noms.map((nom) => scannerFormation(path.join(cheminArchives(racine), nom))),
  );

  return scannees.flatMap((formation, index): EntreeArchive[] => {
    const id = noms[index]!;
    if (!formation) return [{ statut: "invalide", id, erreur: "dossier vide" }];
    if (formation.statut === "invalide") {
      return [{ statut: "invalide", id, erreur: formation.erreur }];
    }
    return [
      {
        statut: "valide",
        id,
        titre: formation.manifeste.titre,
        lecons: leconsOrdonnees(formation.manifeste).length,
      },
    ];
  });
}

/** Liste la corbeille, la plus récente d'abord (G-R8). */
export async function listerCorbeille(racine: string): Promise<EntreeCorbeille[]> {
  const noms = await sousDossiers(cheminCorbeille(racine));
  const entrees: EntreeCorbeille[] = [];

  for (const nom of noms) {
    const correspondance = NOM_CORBEILLE.exec(nom);
    if (!correspondance) continue;
    entrees.push({
      entree: nom,
      id: correspondance[1]!,
      titre: await titreDeDossier(path.join(cheminCorbeille(racine), nom)),
      supprimeeLe: dateDe(correspondance[2]!),
    });
  }

  return entrees.sort((a, b) => b.supprimeeLe.localeCompare(a.supprimeeLe));
}

/**
 * Titre affiché d'un dossier de corbeille. Le scan ne convient pas ici : il
 * exige `id` = nom du dossier (F-R3), or le dossier porte un suffixe horodaté.
 */
async function titreDeDossier(dossier: string): Promise<string | null> {
  try {
    const texte = await fs.readFile(path.join(dossier, "formation.json"), "utf8");
    const brut: unknown = JSON.parse(texte);
    if (typeof brut === "object" && brut !== null && "titre" in brut) {
      const titre = (brut as { titre: unknown }).titre;
      if (typeof titre === "string" && titre.length > 0) return titre;
    }
  } catch {
    // Manifeste absent ou illisible : la corbeille l'affiche par son id.
  }
  return null;
}

/** `20260815-142530` → date ISO locale, pour affichage. */
function dateDe(horodatage: string): string {
  const [jour = "", heure = ""] = horodatage.split("-");
  const nombres = [
    jour.slice(0, 4),
    jour.slice(4, 6),
    jour.slice(6, 8),
    heure.slice(0, 2),
    heure.slice(2, 4),
    heure.slice(4, 6),
  ].map(Number);
  const date = new Date(
    nombres[0]!,
    nombres[1]! - 1,
    nombres[2]!,
    nombres[3]!,
    nombres[4]!,
    nombres[5]!,
  );
  return Number.isNaN(date.getTime()) ? horodatage : date.toISOString();
}

/** Identifiants déjà pris, actifs comme archivés — pour dériver un id libre. */
export async function identifiantsPris(racine: string): Promise<Set<string>> {
  const actifs = await sousDossiers(racine);
  const archives = await sousDossiers(cheminArchives(racine));
  return new Set([
    ...actifs.filter((nom) => !nom.startsWith(".")),
    ...archives,
  ]);
}
