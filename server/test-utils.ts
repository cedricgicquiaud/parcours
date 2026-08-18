import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { creerApi, type DependancesApi } from "./api";
import { ouvrirBase } from "./base";
import { NOM_COOKIE } from "./comptes/auth";
import { BaseComptes, type Role } from "./comptes/db";
import { BaseJetons } from "./comptes/jetons";
import { ExpediteurJournal } from "./courriel/envoi";
import { BaseReglages } from "./reglages";
import type { MoteurRendu } from "./markdown/rendu";
import { BaseCriteres } from "./progression/criteres";
import { BaseProgression } from "./progression/db";
import { MoteurRecherche } from "./recherche/moteur";

/**
 * Contexte d'un test d'API : dossiers temporaires, base neuve, application
 * montée, et un `appeler` déjà authentifié. Toutes les routes exigent une
 * session depuis P011 — sans ce raccourci, chaque test devrait se connecter.
 */
export interface ContexteTest {
  racine: string;
  app: ReturnType<typeof creerApi>;
  base: BaseProgression;
  criteres: BaseCriteres;
  comptes: BaseComptes;
  jetons: BaseJetons;
  reglages: BaseReglages;
  /** Messages « envoyés » pendant le test, dans l'ordre. */
  courriels: ExpediteurJournal;
  /** Requête authentifiée comme le compte courant (l'admin par défaut). */
  appeler: (chemin: string, init?: RequestInit) => Promise<Response> | Response;
  /** Requête sans cookie de session. */
  appelerAnonyme: (chemin: string, init?: RequestInit) => Promise<Response> | Response;
  /** Ouvre une session pour un autre compte et renvoie son `appeler`. */
  connecter: (nom: string, role?: Role) => Promise<ContexteTest["appeler"]>;
  /** `eleve` → `eleve@parcours.test`, l'adresse réellement enregistrée. */
  adresseDe: (nom: string) => string;
  utilisateurId: number;
  jeton: string;
  fermer: () => Promise<void>;
}

export const MOT_DE_PASSE_TEST = "motdepasse-de-test";

/**
 * Écrit une formation sur le disque pour un test d'API : les fichiers donnés
 * (chemin relatif → contenu), puis le manifeste TEL QUEL — non validé, pour
 * que les tests d'invalidité puissent écrire des manifestes cassés exprès.
 * Renvoie le chemin du dossier.
 */
export async function ecrireFormation(
  racine: string,
  manifeste: { id: string } & Record<string, unknown>,
  fichiers: Record<string, string> = {},
): Promise<string> {
  const dossier = path.join(racine, manifeste.id);
  await fs.mkdir(dossier, { recursive: true });
  for (const [relatif, contenu] of Object.entries(fichiers)) {
    const complet = path.join(dossier, relatif);
    await fs.mkdir(path.dirname(complet), { recursive: true });
    await fs.writeFile(complet, contenu, "utf8");
  }
  await fs.writeFile(
    path.join(dossier, "formation.json"),
    JSON.stringify(manifeste),
    "utf8",
  );
  return dossier;
}

export async function creerContexteTest(options: {
  rendu: MoteurRendu;
  prefixe?: string;
  /** Rôle du compte connecté par défaut. */
  role?: Role;
}): Promise<ContexteTest> {
  const prefixe = options.prefixe ?? "parcours-test-";
  const racine = await fs.mkdtemp(path.join(os.tmpdir(), prefixe));
  const dossierDb = await fs.mkdtemp(path.join(os.tmpdir(), `${prefixe}db-`));

  const ouverte = ouvrirBase(path.join(dossierDb, "parcours.db"));
  const base = new BaseProgression(ouverte.db);
  const criteres = new BaseCriteres(ouverte.db);
  const comptes = new BaseComptes(ouverte.db);
  const jetons = new BaseJetons(ouverte.db);
  const reglages = new BaseReglages(ouverte.db);
  // Les tests ne parlent à aucun serveur de courriel : les messages sont
  // collectés en mémoire et inspectables.
  const expediteur = new ExpediteurJournal(() => undefined);
  const deps: DependancesApi = {
    dossierFormations: racine,
    base,
    criteres,
    comptes,
    jetons,
    reglages,
    expediteur,
    rendu: options.rendu,
    recherche: new MoteurRecherche(options.rendu),
  };
  const app = creerApi(deps);

  const requete = (jeton: string | null) => (chemin: string, init: RequestInit = {}) =>
    app.request(`http://127.0.0.1:4620${chemin}`, {
      ...init,
      headers: {
        host: "127.0.0.1:4620",
        "content-type": "application/json",
        ...(jeton ? { cookie: `${NOM_COOKIE}=${jeton}` } : {}),
        ...(init.headers ?? {}),
      },
    });

  const anonyme = requete(null);

  /**
   * L'identifiant est une adresse e-mail depuis P012 : les tests passent des
   * noms courts, complétés ici sur un domaine réservé aux exemples.
   */
  const adresseDe = (nom: string) => (nom.includes("@") ? nom : `${nom}@parcours.test`);

  /** Crée un compte via l'API d'installation ou directement, puis se connecte. */
  async function ouvrirCompte(nom: string, role: Role) {
    const identifiant = adresseDe(nom);
    if (comptes.installationRequise() && role === "admin") {
      const reponse = await anonyme("/api/auth/installer", {
        method: "POST",
        body: JSON.stringify({ identifiant, motDePasse: MOT_DE_PASSE_TEST }),
      });
      // La session ouverte par l'installation est réutilisée : en créer une
      // seconde fausserait les tests qui comptent les sessions (CO-R4).
      const jeton = cookieDeSession(reponse);
      const installe = comptes.ligneParIdentifiant(identifiant);
      if (jeton && installe) return { id: installe.id, jeton };
    } else {
      const { hacher } = await import("./comptes/motdepasse");
      comptes.creer({
        identifiant,
        nom: identifiant,
        empreinte: await hacher(MOT_DE_PASSE_TEST),
        role,
        // Les comptes de test sont confirmés : la vérification d'adresse a ses
        // propres tests, elle n'a pas à gêner tous les autres.
        emailVerifie: true,
      });
    }
    const compte = comptes.ligneParIdentifiant(identifiant);
    if (!compte) throw new Error(`compte de test non créé : ${identifiant}`);
    return { id: compte.id, jeton: comptes.ouvrirSession(compte.id) };
  }

  const principal = await ouvrirCompte("admin-test", options.role ?? "admin");

  return {
    racine,
    app,
    base,
    criteres,
    comptes,
    jetons,
    reglages,
    courriels: expediteur,
    adresseDe,
    appeler: requete(principal.jeton),
    appelerAnonyme: anonyme,
    utilisateurId: principal.id,
    jeton: principal.jeton,
    connecter: async (nom, role = "lecteur") => {
      const autre = await ouvrirCompte(nom, role);
      return requete(autre.jeton);
    },
    fermer: async () => {
      base.fermer();
      await fs.rm(racine, { recursive: true, force: true });
      await fs.rm(dossierDb, { recursive: true, force: true });
    },
  };
}

/** Extrait la valeur du cookie de session d'une réponse, s'il y en a un. */
export function cookieDeSession(reponse: Response): string | null {
  const entete = reponse.headers.get("set-cookie");
  if (!entete) return null;
  const correspondance = new RegExp(`${NOM_COOKIE}=([^;]*)`).exec(entete);
  return correspondance?.[1] ?? null;
}
