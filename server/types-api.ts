import type { Compte, Role } from "./comptes/db";
import type { EntreeArchive, EntreeCorbeille } from "./formations/cycle";
import type { ResultatImport } from "./formations/import";
import type { ActionFormation, Avancement } from "./progression/calculs";
import type { ResultatRecherche } from "./recherche/moteur";

export type {
  ActionFormation,
  Avancement,
  Compte,
  EntreeArchive,
  EntreeCorbeille,
  ResultatRecherche,
  Role,
};

/** État d'authentification, interrogé au démarrage de l'interface (AU-R1). */
export interface ReponseEtatAuth {
  installationRequise: boolean;
  compte: Compte | null;
}

export interface ReponseCompte {
  compte: Compte;
}

export interface ReponseInstallation {
  compte: Compte;
  /** Coches d'avant les comptes reprises par ce premier administrateur (CO-R3). */
  progressionHeritee: number;
}

export interface ReponseUtilisateurs {
  utilisateurs: Compte[];
}

/** Mot de passe provisoire montré une seule fois (CO-R10). */
export interface ReponseReinitialisation {
  motDePasseProvisoire: string;
  compte: Compte;
}

export interface ReponseChangementMotDePasse {
  change: boolean;
  sessionsRevoquees: number;
}

export interface CarteFormationValide {
  statut: "valide";
  id: string;
  titre: string;
  description?: string;
  modules: number;
  lecons: number;
  faites: number;
  pourcentage: number;
  action: ActionFormation;
  prochaine: { id: string; titre: string; moduleTitre: string } | null;
}

export interface CarteFormationInvalide {
  statut: "invalide";
  id: string;
  erreur: string;
}

export type CarteFormation = CarteFormationValide | CarteFormationInvalide;

export interface ReponseCatalogue {
  formations: CarteFormation[];
  /** Formations archivées, hors des compteurs du catalogue (G-R10). */
  archivees: EntreeArchive[];
  /** Formations en corbeille, restaurables (G-R8). */
  corbeille: EntreeCorbeille[];
  /** Problème sur le dossier de formations lui-même (F-R1). */
  erreurGlobale?: string;
  /** Bandeau « progression réinitialisée » (P-R1). */
  progressionReinitialisee: boolean;
}

/** Réponse d'un import par dépôt de dossier (G-R2). */
export type ReponseImport = ResultatImport;

/** Contenu de la corbeille, avec son chemin réel — Parcours ne la vide pas (G-R9). */
export interface ReponseCorbeille {
  entrees: EntreeCorbeille[];
  dossier: string;
}

/** Réponse d'une mise à la corbeille : la clé pour restaurer. */
export interface ReponseCorbeilleAjout {
  entree: string;
}

export interface ReponseFormation {
  id: string;
  titre: string;
  description?: string;
  avancement: Avancement;
}

export interface ReponseLecon {
  formationId: string;
  formationTitre: string;
  leconId: string;
  titre: string;
  moduleId: string;
  moduleTitre: string;
  /** HTML déjà assaini par le serveur (A-R5). */
  html: string;
  faite: boolean;
  /** Rang de la leçon dans la formation, à partir de 1. */
  position: number;
  total: number;
  precedente: { id: string; titre: string } | null;
  suivante: { id: string; titre: string } | null;
}

export interface ReponseRechercheApi {
  resultats: ResultatRecherche[];
  total: number;
  nonIndexees: number;
  message?: string;
}

export interface ReponseProgression {
  faite: boolean;
  avancement: Avancement;
}

export interface ReponseSuppression {
  supprimees: number;
  avancement: Avancement;
}

/** Réponse des routes d'écriture de l'espace d'administration (P008). */
export interface ReponseEcriture {
  id: string;
  titre: string;
  /** Fichiers de leçons créés vides — jamais un fichier existant. */
  fichiersCrees: string[];
}

/** Source markdown d'une leçon, pour l'éditeur (P009). */
export interface ReponseSourceLecon {
  formationId: string;
  leconId: string;
  titre: string;
  fichier: string;
  markdown: string;
  /** État du fichier au chargement — renvoyé à l'enregistrement (P009). */
  jeton: string;
}

export interface ReponseEnregistrementSource {
  jeton: string;
}

/** Aperçu rendu par le serveur d'un markdown non enregistré (A-R5). */
export interface ReponseApercu {
  html: string;
}

export interface ReponseErreur {
  erreur: string;
}
