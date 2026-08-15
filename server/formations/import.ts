import fs from "node:fs/promises";
import path from "node:path";
import { identifiantsPris } from "./cycle";
import {
  EXTENSIONS_IMPORT,
  EXTENSIONS_MARKDOWN,
} from "./extensions";
import {
  analyserJson,
  cheminConfine,
  leconsOrdonnees,
  validerManifeste,
  type Manifeste,
  type Validation,
} from "./manifeste";
import { TAILLE_MAX_LECON } from "./scan";
import { slugifier, slugUnique } from "./slug";

/** Un fichier d'un dossier déposé. Le chemin est relatif au dépôt (G-R2). */
export interface FichierDepose {
  chemin: string;
  contenu: string;
  encodage?: "utf8" | "base64";
}

export interface DemandeImport {
  /** Nom du dossier déposé — sert de titre et de base d'identifiant. */
  nom: string;
  fichiers: FichierDepose[];
  /** Importer avec un sommaire déduit malgré un `formation.json` refusé. */
  ignorerManifeste?: boolean;
}

export interface ResultatImport {
  id: string;
  titre: string;
  lecons: number;
  /** Vrai si Parcours a construit le sommaire lui-même (G-R4). */
  manifesteGenere: boolean;
  /** Entrées écartées du dépôt (fichiers système). */
  ignores: string[];
}

/** Un import ne peut pas dépasser ces bornes (G-R2). */
export const MAX_FICHIERS = 500;
export const MAX_OCTETS = 25_000_000;

const NOM_MANIFESTE = "formation.json";
const DOSSIERS_SYSTEME = new Set(["__MACOSX", "node_modules"]);

/** Un échec d'import peut proposer de réessayer avec un sommaire déduit. */
type EchecImport = { ok: false; erreur: string; peutGenerer?: boolean };

function echec(erreur: string, peutGenerer = false): EchecImport {
  return peutGenerer ? { ok: false, erreur, peutGenerer } : { ok: false, erreur };
}

interface Entree {
  /** Chemin relatif à la racine de la formation, normalisé. */
  chemin: string;
  octets: Buffer;
}

/**
 * Écarte les entrées système et retire le préfixe commun du dépôt : déposer
 * « MonCours » donne des chemins `MonCours/lecons/a.md` qu'il faut ramener à
 * `lecons/a.md`.
 */
function normaliserEntrees(
  fichiers: FichierDepose[],
): Validation<{ entrees: Entree[]; ignores: string[] }> {
  const ignores: string[] = [];
  const retenus: FichierDepose[] = [];

  for (const fichier of fichiers) {
    if (typeof fichier?.chemin !== "string" || typeof fichier.contenu !== "string") {
      return echec("fichiers : { chemin, contenu } attendus");
    }
    const segments = fichier.chemin.split("/").filter((segment) => segment.length > 0);
    // `..` et `.` ne sont pas des entrées système : ils doivent aller jusqu'au
    // contrôle de confinement pour être refusés explicitement, pas écartés.
    const systeme = segments.some(
      (segment) =>
        (segment.startsWith(".") && segment !== "." && segment !== "..") ||
        DOSSIERS_SYSTEME.has(segment),
    );
    if (systeme) {
      ignores.push(fichier.chemin);
      continue;
    }
    retenus.push(fichier);
  }

  const prefixe = prefixeCommun(retenus.map((fichier) => fichier.chemin));
  const entrees: Entree[] = [];
  for (const fichier of retenus) {
    const relatif = prefixe
      ? fichier.chemin.slice(prefixe.length + 1)
      : fichier.chemin;
    const confine = cheminConfine(relatif);
    if (!confine.ok) return confine;

    const extension = path.extname(confine.valeur).toLowerCase();
    if (!EXTENSIONS_IMPORT.has(extension)) {
      return echec(`extension non acceptée à l'import : ${extension || "(aucune)"}`);
    }

    const octets =
      fichier.encodage === "base64"
        ? Buffer.from(fichier.contenu, "base64")
        : Buffer.from(fichier.contenu, "utf8");
    if (EXTENSIONS_MARKDOWN.has(extension) && octets.byteLength > TAILLE_MAX_LECON) {
      return echec(`fichier trop volumineux (2 Mo maximum) : ${confine.valeur}`);
    }
    entrees.push({ chemin: confine.valeur, octets });
  }

  return { ok: true, valeur: { entrees, ignores } };
}

/** Premier segment commun à tous les chemins, s'il y en a un. */
function prefixeCommun(chemins: string[]): string | null {
  if (chemins.length === 0) return null;
  const premier = chemins[0]!.split("/")[0] ?? "";
  if (!premier || chemins.some((chemin) => !chemin.startsWith(`${premier}/`))) {
    return null;
  }
  return premier;
}

/** Nom de fichier ou de dossier rendu lisible : `03_premiers-pas` → « Premiers pas ». */
export function humaniser(nom: string): string {
  const sansExtension = nom.replace(/\.[^.]+$/, "");
  const sansRang = sansExtension.replace(/^\d+[-_. ]+/, "");
  const mots = sansRang.replace(/[-_]+/g, " ").trim();
  if (!mots) return sansExtension;
  return mots.charAt(0).toUpperCase() + mots.slice(1);
}

/**
 * Titre d'une leçon : son premier titre de niveau 1, hors bloc de code — un
 * `# commentaire` dans un exemple shell ne doit pas devenir le titre.
 */
export function titreDeLecon(markdown: string, nomFichier: string): string {
  let dansBloc = false;
  for (const ligne of markdown.split("\n", 400)) {
    if (/^\s*(```|~~~)/.test(ligne)) {
      dansBloc = !dansBloc;
      continue;
    }
    if (dansBloc) continue;
    const titre = /^#\s+(.+?)\s*$/.exec(ligne);
    if (titre) return titre[1]!.slice(0, 200);
  }
  return humaniser(nomFichier);
}

/**
 * Construit un sommaire depuis les seuls fichiers markdown (G-R4) : un module
 * par sous-dossier de premier niveau, leçons triées par nom en ordre numérique.
 */
export function deduireManifeste(
  entrees: Entree[],
  formationId: string,
  titreFormation: string,
): Validation<Manifeste> {
  const markdowns = entrees
    .filter((entree) => EXTENSIONS_MARKDOWN.has(path.extname(entree.chemin).toLowerCase()))
    .sort((a, b) => a.chemin.localeCompare(b.chemin, "fr", { numeric: true }));
  if (markdowns.length === 0) return echec("le dépôt ne contient aucun fichier markdown");

  const groupes = new Map<string, Entree[]>();
  for (const entree of markdowns) {
    const dossier = path.dirname(entree.chemin);
    const groupe = dossier === "." ? "" : dossier.split(path.sep)[0]!;
    const liste = groupes.get(groupe);
    if (liste) liste.push(entree);
    else groupes.set(groupe, [entree]);
  }

  // Racine d'abord, puis les sous-dossiers dans l'ordre de leur nom.
  const cles = [...groupes.keys()].sort((a, b) =>
    a === "" ? -1 : b === "" ? 1 : a.localeCompare(b, "fr", { numeric: true }),
  );
  const seul = cles.length === 1;

  const idsModules = new Set<string>();
  const idsLecons = new Set<string>();
  const modules: Manifeste["modules"] = [];

  for (const cle of cles) {
    const titreModule = seul || cle === "" ? "Contenu" : humaniser(cle);
    const idModule = slugUnique(slugifier(titreModule) || "module", idsModules);
    idsModules.add(idModule);

    const lecons = groupes.get(cle)!.map((entree) => {
      const nom = path.basename(entree.chemin);
      const titre = titreDeLecon(entree.octets.toString("utf8"), nom);
      const id = slugUnique(slugifier(titre) || slugifier(nom) || "lecon", idsLecons);
      idsLecons.add(id);
      return { id, titre, fichier: entree.chemin.split(path.sep).join("/") };
    });

    modules.push({ id: idModule, titre: titreModule, lecons });
  }

  return validerManifeste(
    { formatVersion: 1, id: formationId, titre: titreFormation, modules },
    formationId,
  );
}

/**
 * Reprend le `formation.json` du dépôt en réalignant son `id` sur le dossier
 * d'accueil (F-R3) et en vérifiant que ses fichiers sont bien tous présents.
 */
function reprendreManifeste(
  entrees: Entree[],
  formationId: string,
): Validation<Manifeste> {
  const manifeste = entrees.find((entree) => entree.chemin === NOM_MANIFESTE);
  if (!manifeste) return echec(`${NOM_MANIFESTE} absent`);

  const json = analyserJson(manifeste.octets.toString("utf8"));
  if (!json.ok) return json;
  const brut = json.valeur;
  if (typeof brut !== "object" || brut === null || Array.isArray(brut)) {
    return echec("formation.json : objet JSON attendu");
  }

  const valide = validerManifeste({ ...brut, id: formationId }, formationId);
  if (!valide.ok) return valide;

  const presents = new Set(entrees.map((entree) => entree.chemin.split(path.sep).join("/")));
  for (const { lecon } of leconsOrdonnees(valide.valeur)) {
    if (!presents.has(lecon.fichier)) {
      return echec(`fichier de leçon absent du dépôt : ${lecon.fichier}`);
    }
  }
  return valide;
}

/**
 * Importe un dossier déposé (G-R2 à G-R6). Écrit dans un dossier temporaire
 * caché puis renomme d'un bloc : un import refusé ne laisse rien derrière lui,
 * et un import réussi n'apparaît jamais à moitié au catalogue.
 */
export async function importerFormation(
  racine: string,
  demande: DemandeImport,
): Promise<({ ok: true; valeur: ResultatImport } | EchecImport)> {
  const { nom, fichiers } = demande;
  if (typeof nom !== "string" || !Array.isArray(fichiers)) {
    return echec("dépôt : { nom, fichiers } attendus");
  }
  if (fichiers.length === 0) return echec("le dépôt est vide");
  if (fichiers.length > MAX_FICHIERS) {
    return echec(`dépôt trop fourni : ${fichiers.length} fichiers (${MAX_FICHIERS} maximum)`);
  }

  const normalisees = normaliserEntrees(fichiers);
  if (!normalisees.ok) return normalisees;
  const { entrees, ignores } = normalisees.valeur;

  const total = entrees.reduce((somme, entree) => somme + entree.octets.byteLength, 0);
  if (total > MAX_OCTETS) {
    return echec(`dépôt trop volumineux : ${Math.round(total / 1e6)} Mo (25 Mo maximum)`);
  }
  if (!entrees.some((e) => EXTENSIONS_MARKDOWN.has(path.extname(e.chemin).toLowerCase()))) {
    return echec("le dépôt ne contient aucun fichier markdown");
  }

  const base = slugifier(nom);
  if (!base) {
    return echec(`impossible de dériver un identifiant du nom déposé : « ${nom} »`);
  }
  const formationId = slugUnique(base, await identifiantsPris(racine));

  const fourni = entrees.some((entree) => entree.chemin === NOM_MANIFESTE);
  let manifeste: Validation<Manifeste>;
  let manifesteGenere: boolean;
  if (fourni && !demande.ignorerManifeste) {
    manifeste = reprendreManifeste(entrees, formationId);
    // G-R5 : jamais d'import silencieux d'un manifeste refusé — on propose
    // explicitement de déduire le sommaire à la place.
    if (!manifeste.ok) return echec(manifeste.erreur, true);
    manifesteGenere = false;
  } else {
    manifeste = deduireManifeste(entrees, formationId, nom.trim() || formationId);
    if (!manifeste.ok) return manifeste;
    manifesteGenere = true;
  }

  const aEcrire = entrees.filter(
    (entree) => !(manifesteGenere && entree.chemin === NOM_MANIFESTE),
  );
  const ecrit = await ecrireEnBloc(racine, formationId, aEcrire, manifeste.valeur);
  if (!ecrit.ok) return ecrit;

  return {
    ok: true,
    valeur: {
      id: formationId,
      titre: manifeste.valeur.titre,
      lecons: leconsOrdonnees(manifeste.valeur).length,
      manifesteGenere,
      ignores,
    },
  };
}

/** Écrit le dépôt dans un dossier temporaire caché, puis le renomme (G-R6). */
async function ecrireEnBloc(
  racine: string,
  formationId: string,
  entrees: Entree[],
  manifeste: Manifeste,
): Promise<Validation<null>> {
  const cible = path.join(racine, formationId);
  if (path.dirname(cible) !== path.resolve(racine)) {
    return echec(`identifiant hors du dossier de formations : ${formationId}`);
  }

  await fs.mkdir(racine, { recursive: true });
  try {
    await fs.access(cible);
    return echec(`le dossier « ${formationId} » existe déjà`);
  } catch {
    // Libre : c'est le cas attendu.
  }

  const temporaire = await fs.mkdtemp(path.join(racine, ".import-"));
  try {
    for (const entree of entrees) {
      const complet = path.join(temporaire, entree.chemin);
      await fs.mkdir(path.dirname(complet), { recursive: true });
      await fs.writeFile(complet, new Uint8Array(entree.octets));
    }
    await fs.writeFile(
      path.join(temporaire, NOM_MANIFESTE),
      `${JSON.stringify(manifeste, null, 2)}\n`,
      "utf8",
    );
    await fs.rename(temporaire, cible);
    return { ok: true, valeur: null };
  } catch (erreur) {
    await fs.rm(temporaire, { recursive: true, force: true });
    const code = (erreur as NodeJS.ErrnoException).code;
    if (code === "ENOTEMPTY" || code === "EEXIST") {
      return echec(`le dossier « ${formationId} » existe déjà`);
    }
    return echec(`import impossible : ${(erreur as Error).message}`);
  }
}
