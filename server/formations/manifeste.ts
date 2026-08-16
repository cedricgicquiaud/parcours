import path from "node:path";

/** Une leçon telle que déclarée dans le manifeste (F-R4). */
export interface LeconManifeste {
  id: string;
  titre: string;
  fichier: string;
  /** Durée estimée, en minutes (FI-R6). */
  duree?: number;
  /**
   * Leçons de la même formation que celle-ci suppose faites (SU-R1). Simple
   * déclaration d'auteur : elle informe le lecteur, elle ne verrouille rien.
   */
  suppose?: string[];
}

export interface ModuleManifeste {
  id: string;
  titre: string;
  /** Ce que le module apporte, affiché sur la fiche (FI-R7). */
  description?: string;
  lecons: LeconManifeste[];
}

export interface Manifeste {
  formatVersion: number;
  id: string;
  titre: string;
  description?: string;
  /** Champs de la fiche de présentation (phase 07), tous facultatifs. */
  couverture?: string;
  presentation?: string;
  objectifs?: string[];
  prerequis?: string[];
  duree?: number;
  modules: ModuleManifeste[];
}

export type Validation<T> =
  | { ok: true; valeur: T }
  | { ok: false; erreur: string };

/** Seule version de format connue de la V1 (F-R2). */
export const VERSIONS_SUPPORTEES = [1];

/** Taille maximale du manifeste (F-R4). */
export const TAILLE_MAX_MANIFESTE = 1_000_000;

const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const SLUG_LONGUEUR_MAX = 64;

/** Bornes des champs de la fiche (FI-R2 à FI-R7). */
export const MAX_PRESENTATION = 8_000;
export const MAX_LISTE_FICHE = 12;
export const MAX_ENTREE_FICHE = 200;
export const MAX_DESCRIPTION_MODULE = 500;
export const MAX_DUREE = 100_000;
/** Au-delà, ce n'est plus un rappel, c'est un sommaire (SU-R3). */
export const MAX_SUPPOSE = 5;

/** Extensions acceptées pour une couverture (FI-R1) : des images, pas un SVG. */
export const EXTENSIONS_COUVERTURE = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);

/** Liste de chaînes courtes : objectifs, prérequis. Vide = absente (FI-R3). */
function validerListeFiche(
  valeur: unknown,
  champ: string,
): Validation<string[] | undefined> {
  if (valeur === undefined) return { ok: true, valeur: undefined };
  if (!Array.isArray(valeur)) return echec(`${champ} : tableau de chaînes attendu`);
  if (valeur.length === 0) return { ok: true, valeur: undefined };
  if (valeur.length > MAX_LISTE_FICHE) {
    return echec(`${champ} : ${MAX_LISTE_FICHE} entrées au plus`);
  }
  const entrees: string[] = [];
  for (const [i, entree] of valeur.entries()) {
    if (typeof entree !== "string" || entree.trim().length === 0) {
      return echec(`${champ}[${i}] : chaîne non vide attendue`);
    }
    if (entree.length > MAX_ENTREE_FICHE) {
      return echec(`${champ}[${i}] : ${MAX_ENTREE_FICHE} caractères au plus`);
    }
    entrees.push(entree.trim());
  }
  return { ok: true, valeur: entrees };
}

/** Durée en minutes, entière et bornée (FI-R5, FI-R6). */
function validerDuree(valeur: unknown, champ: string): Validation<number | undefined> {
  if (valeur === undefined) return { ok: true, valeur: undefined };
  if (typeof valeur !== "number" || !Number.isInteger(valeur)) {
    return echec(`${champ} : entier de minutes attendu`);
  }
  if (valeur < 1 || valeur > MAX_DUREE) {
    return echec(`${champ} : entre 1 et ${MAX_DUREE} minutes`);
  }
  return { ok: true, valeur };
}

/**
 * Valide `suppose` (SU-R2, SU-R3). N'exige **pas** que les identifiants
 * existent : une leçon retirée du sommaire ne doit pas rendre toute la
 * formation invalide (SU-R4). Le rendu ignore ce qu'il ne trouve pas.
 */
function validerSuppose(
  valeur: unknown,
  champ: string,
): Validation<string[] | undefined> {
  if (valeur === undefined) return { ok: true, valeur: undefined };
  if (!Array.isArray(valeur)) {
    return echec(`${champ} : tableau d'identifiants attendu`);
  }
  if (valeur.length === 0) return { ok: true, valeur: undefined };
  if (valeur.length > MAX_SUPPOSE) {
    return echec(`${champ} : ${MAX_SUPPOSE} identifiants au plus`);
  }
  for (const [index, entree] of valeur.entries()) {
    if (typeof entree !== "string" || !slugValide(entree)) {
      return echec(`${champ}[${index}] : slug invalide`);
    }
  }
  return { ok: true, valeur: valeur as string[] };
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

function slugValide(valeur: string): boolean {
  return SLUG.test(valeur) && valeur.length <= SLUG_LONGUEUR_MAX;
}

function echec(erreur: string): { ok: false; erreur: string } {
  return { ok: false, erreur };
}

/**
 * Analyse le texte d'un `formation.json` (C-R5 : position de l'erreur de parse,
 * F-R4 : taille plafonnée).
 */
export function analyserJson(texte: string): Validation<unknown> {
  if (Buffer.byteLength(texte, "utf8") > TAILLE_MAX_MANIFESTE) {
    return echec("manifeste trop volumineux");
  }
  try {
    return { ok: true, valeur: JSON.parse(texte) as unknown };
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : String(erreur);
    return echec(`formation.json illisible : ${message}`);
  }
}

/** Champs obligatoires et types, dans l'ordre du document (F-R4). */
function validerStructure(brut: unknown): Validation<Manifeste> {
  if (!estObjet(brut)) return echec("formation.json : objet JSON attendu");

  if (brut.formatVersion === undefined) return echec("formatVersion manquant");
  if (typeof brut.formatVersion !== "number") {
    return echec("formatVersion : nombre attendu");
  }
  if (!VERSIONS_SUPPORTEES.includes(brut.formatVersion)) {
    return echec(
      `version de format ${brut.formatVersion} inconnue (versions supportées : ${VERSIONS_SUPPORTEES.join(", ")})`,
    );
  }

  for (const champ of ["id", "titre"] as const) {
    if (brut[champ] === undefined) return echec(`${champ} manquant`);
    if (typeof brut[champ] !== "string" || brut[champ].length === 0) {
      return echec(`${champ} : chaîne non vide attendue`);
    }
  }
  if (brut.description !== undefined && typeof brut.description !== "string") {
    return echec("description : chaîne attendue");
  }

  // Champs de la fiche (FI-R1 à FI-R5), après description et avant les modules :
  // l'ordre de validation reste déterministe (F-R2).
  if (brut.couverture !== undefined) {
    if (typeof brut.couverture !== "string" || brut.couverture.length === 0) {
      return echec("couverture : chaîne non vide attendue");
    }
    const confine = cheminConfine(brut.couverture);
    if (!confine.ok) return echec(`couverture : ${confine.erreur}`);
    if (!EXTENSIONS_COUVERTURE.has(path.extname(confine.valeur).toLowerCase())) {
      return echec(
        `couverture : image attendue (${[...EXTENSIONS_COUVERTURE].join(", ")})`,
      );
    }
  }
  if (brut.presentation !== undefined) {
    if (typeof brut.presentation !== "string") {
      return echec("presentation : chaîne attendue");
    }
    if (brut.presentation.length > MAX_PRESENTATION) {
      return echec(`presentation : ${MAX_PRESENTATION} caractères au plus`);
    }
  }
  const objectifs = validerListeFiche(brut.objectifs, "objectifs");
  if (!objectifs.ok) return objectifs;
  const prerequis = validerListeFiche(brut.prerequis, "prerequis");
  if (!prerequis.ok) return prerequis;
  const dureeFormation = validerDuree(brut.duree, "duree");
  if (!dureeFormation.ok) return dureeFormation;

  if (brut.modules === undefined) return echec("modules manquant");
  if (!Array.isArray(brut.modules) || brut.modules.length === 0) {
    return echec("modules : au moins un module attendu");
  }

  const modules: ModuleManifeste[] = [];
  for (const [i, moduleBrut] of brut.modules.entries()) {
    const chemin = `modules[${i}]`;
    if (!estObjet(moduleBrut)) return echec(`${chemin} : objet JSON attendu`);

    for (const champ of ["id", "titre"] as const) {
      if (moduleBrut[champ] === undefined) return echec(`${chemin}.${champ} manquant`);
      if (typeof moduleBrut[champ] !== "string" || moduleBrut[champ].length === 0) {
        return echec(`${chemin}.${champ} : chaîne non vide attendue`);
      }
    }
    if (moduleBrut.description !== undefined) {
      if (typeof moduleBrut.description !== "string") {
        return echec(`${chemin}.description : chaîne attendue`);
      }
      if (moduleBrut.description.length > MAX_DESCRIPTION_MODULE) {
        return echec(
          `${chemin}.description : ${MAX_DESCRIPTION_MODULE} caractères au plus`,
        );
      }
    }
    if (moduleBrut.lecons === undefined) return echec(`${chemin}.lecons manquant`);
    if (!Array.isArray(moduleBrut.lecons) || moduleBrut.lecons.length === 0) {
      return echec(`${chemin}.lecons : au moins une leçon attendue`);
    }

    const lecons: LeconManifeste[] = [];
    for (const [j, leconBrute] of moduleBrut.lecons.entries()) {
      const cheminLecon = `${chemin}.lecons[${j}]`;
      if (!estObjet(leconBrute)) return echec(`${cheminLecon} : objet JSON attendu`);
      for (const champ of ["id", "titre", "fichier"] as const) {
        if (leconBrute[champ] === undefined) {
          return echec(`${cheminLecon}.${champ} manquant`);
        }
        if (typeof leconBrute[champ] !== "string" || leconBrute[champ].length === 0) {
          return echec(`${cheminLecon}.${champ} : chaîne non vide attendue`);
        }
      }
      const dureeLecon = validerDuree(leconBrute.duree, `${cheminLecon}.duree`);
      if (!dureeLecon.ok) return dureeLecon;
      const suppose = validerSuppose(leconBrute.suppose, `${cheminLecon}.suppose`);
      if (!suppose.ok) return suppose;
      const lecon: LeconManifeste = {
        id: leconBrute.id as string,
        titre: leconBrute.titre as string,
        fichier: leconBrute.fichier as string,
      };
      if (dureeLecon.valeur !== undefined) lecon.duree = dureeLecon.valeur;
      if (suppose.valeur !== undefined) lecon.suppose = suppose.valeur;
      lecons.push(lecon);
    }
    const module: ModuleManifeste = {
      id: moduleBrut.id as string,
      titre: moduleBrut.titre as string,
      lecons,
    };
    if (typeof moduleBrut.description === "string") {
      module.description = moduleBrut.description;
    }
    modules.push(module);
  }

  const manifeste: Manifeste = {
    formatVersion: brut.formatVersion,
    id: brut.id as string,
    titre: brut.titre as string,
    modules,
  };
  if (typeof brut.description === "string") manifeste.description = brut.description;
  if (typeof brut.couverture === "string") manifeste.couverture = brut.couverture;
  if (typeof brut.presentation === "string") manifeste.presentation = brut.presentation;
  if (objectifs.valeur) manifeste.objectifs = objectifs.valeur;
  if (prerequis.valeur) manifeste.prerequis = prerequis.valeur;
  if (dureeFormation.valeur !== undefined) manifeste.duree = dureeFormation.valeur;
  return { ok: true, valeur: manifeste };
}

/** Slugs et correspondance id ↔ nom du dossier (F-R3). */
function validerSlugs(manifeste: Manifeste, nomDossier: string): Validation<null> {
  if (!slugValide(manifeste.id)) return echec("id : slug invalide");
  if (manifeste.id.normalize("NFC") !== nomDossier.normalize("NFC")) {
    return echec(`id "${manifeste.id}" ≠ nom du dossier "${nomDossier}"`);
  }
  for (const [i, module] of manifeste.modules.entries()) {
    if (!slugValide(module.id)) return echec(`modules[${i}].id : slug invalide`);
    for (const [j, lecon] of module.lecons.entries()) {
      if (!slugValide(lecon.id)) {
        return echec(`modules[${i}].lecons[${j}].id : slug invalide`);
      }
    }
  }
  return { ok: true, valeur: null };
}

/** Unicité des ids de modules et de leçons dans TOUTE la formation (F-R3). */
function validerUnicite(manifeste: Manifeste): Validation<null> {
  const modulesVus = new Set<string>();
  const leconsVues = new Set<string>();
  for (const [i, module] of manifeste.modules.entries()) {
    if (modulesVus.has(module.id)) {
      return echec(`modules[${i}].id "${module.id}" en double`);
    }
    modulesVus.add(module.id);
    for (const [j, lecon] of module.lecons.entries()) {
      if (leconsVues.has(lecon.id)) {
        return echec(`modules[${i}].lecons[${j}].id "${lecon.id}" en double`);
      }
      leconsVues.add(lecon.id);
    }
  }
  return { ok: true, valeur: null };
}

/**
 * Chemin de fichier confiné au dossier de la formation (F-R5) : ni absolu, ni
 * `..`, ni backslash. Retourne le chemin relatif normalisé.
 */
export function cheminConfine(valeur: string): Validation<string> {
  if (valeur.includes("\\") || path.isAbsolute(valeur) || valeur.startsWith("/")) {
    return echec(`chemin hors formation : ${valeur}`);
  }
  const segments = valeur.split("/");
  if (segments.some((segment) => segment === ".." || segment === "")) {
    return echec(`chemin hors formation : ${valeur}`);
  }
  return { ok: true, valeur: path.join(...segments) };
}

/** Confinement des chemins de leçons (F-R5), sans toucher au disque. */
function validerChemins(manifeste: Manifeste): Validation<null> {
  for (const module of manifeste.modules) {
    for (const lecon of module.lecons) {
      const confine = cheminConfine(lecon.fichier);
      if (!confine.ok) return confine;
    }
  }
  return { ok: true, valeur: null };
}

/**
 * Validation complète hors accès disque, dans l'ordre déterministe F-R11 :
 * formatVersion → structure → slugs → unicité → confinement des chemins.
 * L'existence réelle des fichiers est vérifiée par le scan (F-R5).
 */
export function validerManifeste(
  brut: unknown,
  nomDossier: string,
): Validation<Manifeste> {
  const structure = validerStructure(brut);
  if (!structure.ok) return structure;

  const slugs = validerSlugs(structure.valeur, nomDossier);
  if (!slugs.ok) return slugs;

  const unicite = validerUnicite(structure.valeur);
  if (!unicite.ok) return unicite;

  const chemins = validerChemins(structure.valeur);
  if (!chemins.ok) return chemins;

  return structure;
}

/** Toutes les leçons de la formation, dans l'ordre du manifeste (P-R3, S-R5). */
export function leconsOrdonnees(
  manifeste: Manifeste,
): Array<{ module: ModuleManifeste; lecon: LeconManifeste }> {
  return manifeste.modules.flatMap((module) =>
    module.lecons.map((lecon) => ({ module, lecon })),
  );
}
