import type { Compte, Role } from "./comptes/db";
import type { EntreeArchive, EntreeCorbeille } from "./formations/cycle";
import type { ResultatImport } from "./formations/import";
import type { ActionFormation, Avancement } from "./progression/calculs";
import type { Reglages } from "./reglages";
import type { ResultatRecherche } from "./recherche/moteur";

export type {
  ActionFormation,
  Avancement,
  Compte,
  EntreeArchive,
  EntreeCorbeille,
  Reglages,
  ResultatRecherche,
  Role,
};

/** État d'authentification, interrogé au démarrage de l'interface (AU-R1). */
export interface ReponseEtatAuth {
  installationRequise: boolean;
  compte: Compte | null;
  /** L'inscription libre est-elle ouverte (EM-R6) ? */
  inscriptionOuverte: boolean;
}

/** Réponse commune aux gestes qui envoient un courriel (EM-R7, EM-R8). */
export interface ReponseEnvoiCourriel {
  envoye: boolean;
  message: string;
}

/** Réglages de l'instance et mode d'envoi en cours (EM-R12). */
export interface ReponseReglages {
  reglages: Reglages;
  envoiCourriel: "journal" | "smtp";
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
  /** Visuel de la carte (FI-R13) ; la présentation n'y a pas sa place. */
  couverture?: string;
  duree?: number;
  modules: number;
  /** Modules dont toutes les leçons sont faites — les compteurs du catalogue parlent en modules. */
  modulesFaits: number;
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
  /** Champs de la fiche de présentation (phase 07), omis quand ils manquent. */
  couverture?: string;
  /** Présentation déjà rendue et assainie par le serveur (A-R5). */
  presentationHtml?: string;
  objectifs?: string[];
  prerequis?: string[];
  /** Durée totale en minutes (FI-R5). */
  duree?: number;
  avancement: Avancement;
}

/** Un critère de réussite et son état pour le compte connecté (CR-R15). */
export interface EtatCritere {
  id: string;
  texte: string;
  coche: boolean;
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
  /** Critères de la leçon, dans l'ordre du document (CR-R15). */
  criteres: EtatCritere[];
  /** Vrai si la leçon dépasse le plafond de critères suivis (CR-R2b). */
  criteresTronques: boolean;
  /** Rang de la leçon dans la formation, à partir de 1. */
  position: number;
  total: number;
  /** Durée de la leçon en minutes (FI-R6), omise quand le manifeste n'en donne pas. */
  duree?: number;
  precedente: { id: string; titre: string } | null;
  suivante: { id: string; titre: string } | null;
  /**
   * Leçons supposées faites et non encore terminées par ce compte (SU-R6,
   * SU-R7), dans l'ordre du champ `suppose` du manifeste. Omis quand il n'y a
   * rien à signaler.
   */
  suppose?: { id: string; titre: string }[];
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

/** Réponse d'une bascule de critère : l'état complet de la leçon (CR-R14). */
export interface ReponseCritere extends ReponseProgression {
  criteres: EtatCritere[];
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
