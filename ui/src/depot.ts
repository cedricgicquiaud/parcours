import type { FichierDepose } from "../../server/formations/import";

/** Un fichier retenu d'un dépôt, avec son chemin relatif au dossier déposé. */
export interface EntreeDepot {
  chemin: string;
  fichier: File;
}

/** Même plafond que le serveur (G-R2) — refusé ici pour éviter de tout lire. */
export const MAX_OCTETS = 25_000_000;

/** Extensions lues en texte ; les autres transitent en base64 (G-R2). */
const EXTENSIONS_TEXTE = [".md", ".markdown", ".json", ".txt", ".svg"];

/**
 * Entrées d'un dépôt fait avec `<input type="file" webkitdirectory>`. Le
 * navigateur y renseigne `webkitRelativePath` : le chemin dans le dossier.
 */
export function entreesDeSelection(fichiers: ArrayLike<File>): EntreeDepot[] {
  return Array.from(fichiers).map((fichier) => ({
    chemin: fichier.webkitRelativePath || fichier.name,
    fichier,
  }));
}

/**
 * Entrées d'un glisser-déposer. Un dossier déposé arrive comme une entrée
 * d'arborescence qu'il faut parcourir ; à défaut (navigateur sans l'API), on
 * retombe sur la liste plate des fichiers.
 */
export async function entreesDuTransfert(
  transfert: DataTransfer,
): Promise<EntreeDepot[]> {
  const racines = Array.from(transfert.items ?? [])
    .filter((element) => element.kind === "file")
    .map((element) =>
      typeof element.webkitGetAsEntry === "function" ? element.webkitGetAsEntry() : null,
    )
    .filter((entree): entree is FileSystemEntry => entree !== null);

  if (racines.length === 0) return entreesDeSelection(transfert.files ?? []);

  const entrees: EntreeDepot[] = [];
  for (const racine of racines) await parcourir(racine, "", entrees);
  return entrees;
}

async function parcourir(
  entree: FileSystemEntry,
  prefixe: string,
  resultat: EntreeDepot[],
): Promise<void> {
  const chemin = prefixe ? `${prefixe}/${entree.name}` : entree.name;

  if (entree.isFile) {
    const fichier = await new Promise<File | null>((resoudre) => {
      (entree as FileSystemFileEntry).file(resoudre, () => resoudre(null));
    });
    if (fichier) resultat.push({ chemin, fichier });
    return;
  }

  const lecteur = (entree as FileSystemDirectoryEntry).createReader();
  // `readEntries` ne rend qu'un lot à la fois : il faut rappeler jusqu'au vide.
  for (;;) {
    const lot = await new Promise<FileSystemEntry[]>((resoudre) => {
      lecteur.readEntries(resoudre, () => resoudre([]));
    });
    if (lot.length === 0) return;
    for (const enfant of lot) await parcourir(enfant, chemin, resultat);
  }
}

/**
 * Nom du dépôt : le dossier commun à toutes les entrées. Un dépôt de fichiers
 * en vrac n'en a pas — l'appelant demande alors un nom à l'utilisateur.
 */
export function nomDuDepot(entrees: EntreeDepot[]): string | null {
  if (entrees.length === 0) return null;
  const premier = entrees[0]!.chemin.split("/")[0] ?? "";
  if (!premier) return null;
  const commun = entrees.every((entree) => entree.chemin.startsWith(`${premier}/`));
  return commun ? premier : null;
}

export class ErreurDepot extends Error {}

/** Lit les fichiers du dépôt et les encode pour l'API d'import (G-R2). */
export async function construireDepot(
  entrees: EntreeDepot[],
): Promise<FichierDepose[]> {
  const total = entrees.reduce((somme, entree) => somme + entree.fichier.size, 0);
  if (total > MAX_OCTETS) {
    throw new ErreurDepot(
      `Dossier trop volumineux : ${Math.round(total / 1e6)} Mo (25 Mo maximum).`,
    );
  }

  return Promise.all(
    entrees.map(async ({ chemin, fichier }): Promise<FichierDepose> => {
      const minuscule = chemin.toLowerCase();
      if (EXTENSIONS_TEXTE.some((extension) => minuscule.endsWith(extension))) {
        return { chemin, contenu: await fichier.text() };
      }
      return {
        chemin,
        contenu: base64(new Uint8Array(await fichier.arrayBuffer())),
        encodage: "base64",
      };
    }),
  );
}

/** Un fichier unique, encodé pour l'envoi (couverture, FI-R16). */
export async function fichierEnBase64(
  fichier: File,
): Promise<{ nom: string; contenu: string }> {
  return {
    nom: fichier.name,
    contenu: base64(new Uint8Array(await fichier.arrayBuffer())),
  };
}

/** `btoa` ne prend qu'une chaîne : on la construit par tranches. */
function base64(octets: Uint8Array): string {
  let binaire = "";
  const tranche = 0x8000;
  for (let debut = 0; debut < octets.length; debut += tranche) {
    binaire += String.fromCharCode(...octets.subarray(debut, debut + tranche));
  }
  return btoa(binaire);
}
