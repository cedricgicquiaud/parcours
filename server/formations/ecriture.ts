import fs from "node:fs/promises";
import path from "node:path";
import {
  cheminConfine,
  leconsOrdonnees,
  validerManifeste,
  type Manifeste,
  type Validation,
} from "./manifeste";
import { TAILLE_MAX_LECON } from "./scan";
import { slugifier, slugUnique } from "./slug";

/**
 * Structure saisie dans l'espace d'administration (P008). Un `id` absent
 * signale un élément NOUVEAU : le serveur lui dérive un identifiant depuis son
 * titre. Un `id` présent est conservé tel quel — c'est la clé de progression
 * (P004), elle n'est jamais réécrite.
 */
export interface StructureSaisie {
  titre: string;
  description?: string;
  modules: Array<{
    id?: string;
    titre: string;
    lecons: Array<{ id?: string; titre: string }>;
  }>;
}

export interface ResultatEcriture {
  manifeste: Manifeste;
  /** Fichiers de leçons créés vides — les fichiers existants sont intouchés. */
  fichiersCrees: string[];
}

const AMORCE = "Le contenu de cette leçon reste à écrire.\n";

function echec(erreur: string): { ok: false; erreur: string } {
  return { ok: false, erreur };
}

/** Vérifie qu'un titre saisi n'est pas vide et tient dans une ligne. */
function titreValide(valeur: unknown): valeur is string {
  return typeof valeur === "string" && valeur.trim().length > 0 && valeur.length <= 200;
}

/**
 * Construit un manifeste complet à partir de la saisie : dérive les
 * identifiants manquants, conserve les existants, garantit leur unicité.
 */
export function construireManifeste(
  saisie: StructureSaisie,
  formationId: string,
  fichiersExistants: ReadonlyMap<string, string> = new Map(),
): Validation<Manifeste> {
  if (!titreValide(saisie.titre)) return echec("titre : texte non vide attendu");
  if (saisie.description !== undefined && typeof saisie.description !== "string") {
    return echec("description : texte attendu");
  }
  if (!Array.isArray(saisie.modules) || saisie.modules.length === 0) {
    return echec("modules : au moins un module attendu");
  }

  const idsModules = new Set<string>();
  const idsLecons = new Set<string>();
  // Les identifiants déjà attribués sont réservés avant toute dérivation, pour
  // qu'un nouveau titre identique à un ancien ne vienne pas les percuter.
  for (const module of saisie.modules) {
    if (module?.id) idsModules.add(module.id);
    for (const lecon of module?.lecons ?? []) {
      if (lecon?.id) idsLecons.add(lecon.id);
    }
  }

  const modules: Manifeste["modules"] = [];
  for (const [i, module] of saisie.modules.entries()) {
    if (!titreValide(module?.titre)) {
      return echec(`modules[${i}].titre : texte non vide attendu`);
    }
    if (!Array.isArray(module.lecons) || module.lecons.length === 0) {
      return echec(`modules[${i}].lecons : au moins une leçon attendue`);
    }

    const idModule = module.id ?? derive(module.titre, idsModules, `modules[${i}]`);
    if (typeof idModule !== "string") return idModule;
    idsModules.add(idModule);

    const lecons = [];
    for (const [j, lecon] of module.lecons.entries()) {
      const chemin = `modules[${i}].lecons[${j}]`;
      if (!titreValide(lecon?.titre)) {
        return echec(`${chemin}.titre : texte non vide attendu`);
      }
      const idLecon = lecon.id ?? derive(lecon.titre, idsLecons, chemin);
      if (typeof idLecon !== "string") return idLecon;
      idsLecons.add(idLecon);
      lecons.push({
        id: idLecon,
        titre: lecon.titre.trim(),
        // Une leçon existante garde son fichier, même hors convention de
        // nommage : sinon son contenu ne serait plus référencé.
        fichier: fichiersExistants.get(idLecon) ?? `lecons/${idLecon}.md`,
      });
    }
    modules.push({ id: idModule, titre: module.titre.trim(), lecons });
  }

  const manifeste: Manifeste = {
    formatVersion: 1,
    id: formationId,
    titre: saisie.titre.trim(),
    modules,
  };
  const description = saisie.description?.trim();
  if (description) manifeste.description = description;

  // Le manifeste produit repasse par la validation du lecteur : l'écriture ne
  // peut pas fabriquer une formation que le scan refuserait.
  return validerManifeste(manifeste, formationId);
}

function derive(
  titre: string,
  pris: ReadonlySet<string>,
  chemin: string,
): string | { ok: false; erreur: string } {
  const base = slugifier(titre);
  if (!base) {
    return echec(
      `${chemin}.titre : impossible d'en dériver un identifiant, ajoutez des lettres ou des chiffres`,
    );
  }
  return slugUnique(base, pris);
}

/**
 * Jeton d'état d'un fichier de leçon (P009) : date de modification et taille.
 * Il sert à refuser une écriture qui écraserait une version plus récente.
 */
export function jetonDe(infos: { mtimeMs: number; size: number }): string {
  return `${Math.round(infos.mtimeMs)}-${infos.size}`;
}

export interface SourceLecon {
  markdown: string;
  jeton: string;
}

/** Lit le markdown d'une leçon, avec son jeton d'état (P009). */
export async function lireSource(
  dossier: string,
  fichier: string,
): Promise<Validation<SourceLecon>> {
  const confine = cheminConfine(fichier);
  if (!confine.ok) return confine;
  const complet = path.join(dossier, confine.valeur);
  try {
    const infos = await fs.stat(complet);
    if (!infos.isFile()) throw new Error("pas un fichier");
    if (infos.size > TAILLE_MAX_LECON) {
      return echec(`fichier de leçon trop volumineux : ${fichier}`);
    }
    return {
      ok: true,
      valeur: { markdown: await fs.readFile(complet, "utf8"), jeton: jetonDe(infos) },
    };
  } catch {
    return echec(`fichier de leçon introuvable ou illisible : ${fichier}`);
  }
}

/**
 * Écrit le markdown d'une leçon (P009). Refuse si le fichier a changé depuis la
 * lecture : aucune version n'est écrasée en silence.
 */
export async function ecrireSource(
  dossier: string,
  fichier: string,
  markdown: string,
  jetonAttendu: string | undefined,
): Promise<Validation<{ jeton: string }> & { conflit?: boolean }> {
  if (typeof markdown !== "string") return echec("markdown : texte attendu");
  if (Buffer.byteLength(markdown, "utf8") > TAILLE_MAX_LECON) {
    return echec("leçon trop volumineuse (2 Mo maximum)");
  }
  const confine = cheminConfine(fichier);
  if (!confine.ok) return confine;

  const complet = path.join(dossier, confine.valeur);
  try {
    const infos = await fs.stat(complet);
    const jetonActuel = jetonDe(infos);
    if (jetonAttendu !== undefined && jetonAttendu !== jetonActuel) {
      return {
        ...echec(
          "le fichier a changé depuis son ouverture : rechargez la leçon pour ne pas écraser l'autre version",
        ),
        conflit: true,
      };
    }
  } catch {
    // Fichier absent : l'écriture le crée, il n'y a rien à écraser.
  }

  await fs.mkdir(path.dirname(complet), { recursive: true });
  const temporaire = `${complet}.${process.pid}.tmp`;
  await fs.writeFile(temporaire, markdown, "utf8");
  await fs.rename(temporaire, complet);
  const infos = await fs.stat(complet);
  return { ok: true, valeur: { jeton: jetonDe(infos) } };
}

/**
 * Reporte sur le manifeste reconstruit tout ce que l'administration ne gère pas
 * (FI-R9) : couverture, présentation, objectifs, prérequis, durées, description
 * de module — et jusqu'aux champs que Parcours ne connaît pas. Sans cela, un
 * simple renommage de module effacerait le travail éditorial de l'auteur.
 *
 * La fusion se fait APRÈS validation, sur l'objet écrit : la validation, elle,
 * ne garde que les champs qu'elle connaît.
 */
const CHAMPS_GERES = new Set(["formatVersion", "id", "titre", "description", "modules"]);
const CHAMPS_GERES_MODULE = new Set(["id", "titre", "lecons"]);
const CHAMPS_GERES_LECON = new Set(["id", "titre", "fichier"]);

function reporter(
  cible: Record<string, unknown>,
  source: Record<string, unknown> | undefined,
  geres: ReadonlySet<string>,
): void {
  if (!source) return;
  for (const [cle, valeur] of Object.entries(source)) {
    if (!geres.has(cle) && !(cle in cible)) cible[cle] = valeur;
  }
}

export function fusionnerAvecExistant(
  manifeste: Manifeste,
  existant: unknown,
): Record<string, unknown> {
  const fusionne = JSON.parse(JSON.stringify(manifeste)) as Record<string, unknown>;
  if (typeof existant !== "object" || existant === null || Array.isArray(existant)) {
    return fusionne;
  }
  const ancien = existant as Record<string, unknown>;
  reporter(fusionne, ancien, CHAMPS_GERES);

  const modulesAnciens = Array.isArray(ancien.modules) ? ancien.modules : [];
  const parIdModule = new Map<string, Record<string, unknown>>();
  const leconsAnciennes = new Map<string, Record<string, unknown>>();
  for (const moduleAncien of modulesAnciens) {
    if (typeof moduleAncien !== "object" || moduleAncien === null) continue;
    const objet = moduleAncien as Record<string, unknown>;
    if (typeof objet.id === "string") parIdModule.set(objet.id, objet);
    for (const leconAncienne of Array.isArray(objet.lecons) ? objet.lecons : []) {
      if (typeof leconAncienne !== "object" || leconAncienne === null) continue;
      const lecon = leconAncienne as Record<string, unknown>;
      // Une leçon déplacée d'un module à l'autre garde sa durée : la clé est
      // son id, comme pour la progression (P004).
      if (typeof lecon.id === "string") leconsAnciennes.set(lecon.id, lecon);
    }
  }

  for (const module of (fusionne.modules ?? []) as Array<Record<string, unknown>>) {
    reporter(module, parIdModule.get(module.id as string), CHAMPS_GERES_MODULE);
    for (const lecon of (module.lecons ?? []) as Array<Record<string, unknown>>) {
      reporter(lecon, leconsAnciennes.get(lecon.id as string), CHAMPS_GERES_LECON);
    }
  }
  return fusionne;
}

/** Écrit le manifeste de façon atomique : fichier temporaire puis renommage. */
async function ecrireManifeste(
  dossier: string,
  manifeste: Manifeste | Record<string, unknown>,
): Promise<void> {
  const cible = path.join(dossier, "formation.json");
  const temporaire = path.join(dossier, `.formation.json.${process.pid}.tmp`);
  await fs.writeFile(temporaire, `${JSON.stringify(manifeste, null, 2)}\n`, "utf8");
  await fs.rename(temporaire, cible);
}

/**
 * Crée les fichiers de leçons ABSENTS uniquement (P008, garde-fou 1) : un
 * fichier existant n'est jamais réécrit, jamais tronqué.
 */
async function creerFichiersManquants(
  dossier: string,
  manifeste: Manifeste,
): Promise<string[]> {
  const crees: string[] = [];
  for (const { lecon } of leconsOrdonnees(manifeste)) {
    const complet = path.join(dossier, lecon.fichier);
    await fs.mkdir(path.dirname(complet), { recursive: true });
    try {
      // wx : échoue si le fichier existe déjà — c'est exactement ce qu'on veut.
      await fs.writeFile(complet, AMORCE, { encoding: "utf8", flag: "wx" });
      crees.push(lecon.fichier);
    } catch (erreur) {
      if ((erreur as NodeJS.ErrnoException).code !== "EEXIST") throw erreur;
    }
  }
  return crees;
}

/** Crée une formation entière. Échoue si le dossier existe déjà (P008). */
export async function creerFormation(
  racine: string,
  formationId: string,
  saisie: StructureSaisie,
): Promise<Validation<ResultatEcriture>> {
  const construit = construireManifeste(saisie, formationId);
  if (!construit.ok) return construit;

  const dossier = path.join(racine, formationId);
  if (path.dirname(dossier) !== path.resolve(racine)) {
    return echec(`identifiant hors du dossier de formations : ${formationId}`);
  }

  try {
    await fs.mkdir(dossier, { recursive: false });
  } catch (erreur) {
    const code = (erreur as NodeJS.ErrnoException).code;
    if (code === "EEXIST") {
      return echec(`le dossier « ${formationId} » existe déjà`);
    }
    return echec(`création impossible : ${(erreur as Error).message}`);
  }

  await ecrireManifeste(dossier, construit.valeur);
  const fichiersCrees = await creerFichiersManquants(dossier, construit.valeur);
  return { ok: true, valeur: { manifeste: construit.valeur, fichiersCrees } };
}

/**
 * Met à jour titre, description et structure d'une formation existante.
 * Les fichiers des leçons retirées du manifeste restent sur le disque
 * (P008, garde-fou 1) : aucune prose n'est perdue par l'administration.
 */
export async function mettreAJourStructure(
  dossier: string,
  formationId: string,
  saisie: StructureSaisie,
  fichiersExistants: ReadonlyMap<string, string> = new Map(),
): Promise<Validation<ResultatEcriture>> {
  const construit = construireManifeste(saisie, formationId, fichiersExistants);
  if (!construit.ok) return construit;

  // FI-R9 : on relit l'ancien manifeste pour lui reprendre tout ce que la
  // saisie ne porte pas. Illisible ou absent → on écrit le nouveau tel quel.
  let ancien: unknown = null;
  try {
    ancien = JSON.parse(
      await fs.readFile(path.join(dossier, "formation.json"), "utf8"),
    ) as unknown;
  } catch {
    ancien = null;
  }
  await ecrireManifeste(dossier, fusionnerAvecExistant(construit.valeur, ancien));
  const fichiersCrees = await creerFichiersManquants(dossier, construit.valeur);
  return { ok: true, valeur: { manifeste: construit.valeur, fichiersCrees } };
}
