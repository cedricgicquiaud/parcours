import path from "node:path";

/** Une leçon telle que déclarée dans le manifeste (F-R4). */
export interface LeconManifeste {
  id: string;
  titre: string;
  fichier: string;
}

export interface ModuleManifeste {
  id: string;
  titre: string;
  lecons: LeconManifeste[];
}

export interface Manifeste {
  formatVersion: number;
  id: string;
  titre: string;
  description?: string;
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
      lecons.push({
        id: leconBrute.id as string,
        titre: leconBrute.titre as string,
        fichier: leconBrute.fichier as string,
      });
    }
    modules.push({
      id: moduleBrut.id as string,
      titre: moduleBrut.titre as string,
      lecons,
    });
  }

  const manifeste: Manifeste = {
    formatVersion: brut.formatVersion,
    id: brut.id as string,
    titre: brut.titre as string,
    modules,
  };
  if (typeof brut.description === "string") manifeste.description = brut.description;
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
