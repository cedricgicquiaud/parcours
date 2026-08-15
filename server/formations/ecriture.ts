import fs from "node:fs/promises";
import path from "node:path";
import {
  leconsOrdonnees,
  validerManifeste,
  type Manifeste,
  type Validation,
} from "./manifeste";
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

/** Écrit le manifeste de façon atomique : fichier temporaire puis renommage. */
async function ecrireManifeste(dossier: string, manifeste: Manifeste): Promise<void> {
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

  await ecrireManifeste(dossier, construit.valeur);
  const fichiersCrees = await creerFichiersManquants(dossier, construit.valeur);
  return { ok: true, valeur: { manifeste: construit.valeur, fichiersCrees } };
}
