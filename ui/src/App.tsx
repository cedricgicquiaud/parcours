import { useCallback, useEffect, useState } from "react";
import { useAdministration } from "./administration";
import {
  api,
  ErreurApi,
  type Compte,
  type ReponseCatalogue,
  type ReponseFormation,
  type ReponseLecon,
} from "./api";
import { ColonneLaterale } from "./composants/ColonneLaterale";
import { BlocErreur, Icone, Squelette } from "./composants/communs";
import { useMode, useRafraichirAuFocus, useRailReplie } from "./preferences";
import { Administration } from "./pages/Administration";
import { Catalogue } from "./pages/Catalogue";
import { Connexion } from "./pages/Connexion";
import { ConsoleComptes } from "./pages/ConsoleComptes";
import { LienCourriel } from "./pages/LienCourriel";
import { EditeurLecon } from "./pages/EditeurLecon";
import { PageFormation } from "./pages/Formation";
import { PageLecon } from "./pages/Lecon";
import { Profil } from "./pages/Profil";
import { useRecherche } from "./recherche";
import { useRoute, type Route } from "./routeur";
import { useSession } from "./session";

const SEUIL_MOBILE = 720;

/**
 * Racine de l'application : tant que personne n'est connecté, elle ne montre
 * que l'écran d'authentification — ou celui d'installation au tout premier
 * démarrage (AU-R1).
 */
export function App() {
  const session = useSession();
  const { mode } = useMode();
  const { rafraichir: rafraichirSession, surConnexion } = session;
  const surSessionPerdue = useCallback(
    () => void rafraichirSession(),
    [rafraichirSession],
  );

  if (session.etat.phase === "chargement") {
    return (
      <div className={`app p-${mode}`}>
        <main className="principal">
          <div className="page">
            <Squelette largeur="35%" hauteur={22} />
            <Squelette largeur="60%" />
          </div>
        </main>
      </div>
    );
  }

  if (session.etat.phase === "injoignable") {
    return (
      <div className={`app p-${mode}`}>
        <main className="principal">
          <div className="page">
            <BlocErreur
              titre="Parcours ne répond pas"
              message={session.etat.erreur}
              action={
                <button
                  type="button"
                  className="bouton bouton-petit"
                  onClick={() => void session.rafraichir()}
                >
                  Réessayer
                </button>
              }
            />
          </div>
        </main>
      </div>
    );
  }

  // Les liens reçus par courriel (P012) s'ouvrent sans session : ils sont
  // traités avant l'écran de connexion.
  const chemin = window.location.pathname;
  if (chemin === "/confirmer" || chemin === "/reinitialiser") {
    return (
      <div className={`app p-${mode}`}>
        <main className="principal">
          <LienCourriel
            action={chemin === "/confirmer" ? "confirmer" : "reinitialiser"}
            jeton={new URLSearchParams(window.location.search).get("jeton")}
            surConnexion={(compte) => {
              window.history.replaceState(null, "", "/");
              session.surConnexion(compte);
            }}
            surRetour={() => {
              window.history.replaceState(null, "", "/");
              void session.rafraichir();
            }}
          />
        </main>
      </div>
    );
  }

  if (session.etat.phase !== "connecte") {
    return (
      <div className={`app p-${mode}`}>
        <main className="principal">
          <Connexion
            installation={session.etat.phase === "installation"}
            inscriptionOuverte={session.inscriptionOuverte}
            surConnexion={session.surConnexion}
          />
        </main>
      </div>
    );
  }

  return (
    <ApplicationConnectee
      compte={session.etat.compte}
      surCompteChange={surConnexion}
      surDeconnexion={() => void session.deconnecter()}
      surSessionPerdue={surSessionPerdue}
    />
  );
}

function ApplicationConnectee({
  compte,
  surCompteChange,
  surDeconnexion,
  surSessionPerdue,
}: {
  compte: Compte;
  surCompteChange: (compte: Compte) => void;
  surDeconnexion: () => void;
  surSessionPerdue: () => void;
}) {
  const { route, naviguer } = useRoute();
  const { mode, basculer: basculerMode } = useMode();
  const { replie, basculer: basculerReplie } = useRailReplie();
  const [tiroirOuvert, setTiroirOuvert] = useState(false);

  const fid =
    route.nom === "formation" ||
    route.nom === "lecon" ||
    route.nom === "structure" ||
    route.nom === "editer"
      ? route.fid
      : null;
  const lid =
    route.nom === "lecon" || route.nom === "editer" ? route.lid : null;

  const [catalogue, setCatalogue] = useState<ReponseCatalogue | null>(null);
  const [formation, setFormation] = useState<ReponseFormation | null>(null);
  const [lecon, setLecon] = useState<ReponseLecon | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [erreurCoche, setErreurCoche] = useState<string | null>(null);

  const recherche = useRecherche(fid);

  /**
   * `discret` : rafraîchissement sans squelette — au retour sur la fenêtre, les
   * données déjà affichées restent en place le temps du refetch (P-R7).
   */
  const charger = useCallback(async (discret = false) => {
    setErreur(null);
    if (!discret) setChargement(true);
    try {
      const promesses: [
        Promise<ReponseCatalogue>,
        Promise<ReponseFormation> | null,
        Promise<ReponseLecon> | null,
      ] = [
        api.catalogue(),
        fid ? api.formation(fid) : null,
        fid && lid ? api.lecon(fid, lid) : null,
      ];
      const [resultatCatalogue, resultatFormation, resultatLecon] = await Promise.all([
        promesses[0],
        promesses[1] ?? Promise.resolve(null),
        promesses[2] ?? Promise.resolve(null),
      ]);
      setCatalogue(resultatCatalogue);
      setFormation(resultatFormation);
      setLecon(resultatLecon);
    } catch (cause: unknown) {
      // Session expirée ou révoquée pendant la navigation (AU-R3, CO-R9) :
      // on repasse par l'écran de connexion plutôt que d'afficher une erreur.
      if (cause instanceof ErreurApi && cause.statut === 401) {
        surSessionPerdue();
        return;
      }
      setErreur(cause instanceof Error ? cause.message : "erreur inconnue");
    } finally {
      setChargement(false);
    }
    // `route.nom` fait partie des dépendances : on passe de l'éditeur à la
    // leçon sans changer de formation ni de leçon, et le contenu doit malgré
    // tout être relu — sinon la leçon resterait affichée telle qu'avant
    // modification.
  }, [fid, lid, route.nom, surSessionPerdue]);

  // Refetch à chaque navigation (P-R7).
  useEffect(() => {
    void charger();
  }, [charger]);

  // …et au retour sur la fenêtre, sans faire clignoter l'écran (P-R7).
  const rafraichir = useCallback(() => void charger(true), [charger]);
  useRafraichirAuFocus(rafraichir);

  const naviguerEtFermer = useCallback(
    (cible: Route) => {
      setTiroirOuvert(false);
      naviguer(cible);
    },
    [naviguer],
  );

  // Une seule instance pour toute l'application : le message d'une action
  // lancée depuis l'écran formation doit s'afficher au catalogue, où l'on
  // atterrit juste après (P010).
  const administration = useAdministration(rafraichir);

  /** Archiver ou jeter la formation ouverte ramène au catalogue (P010). */
  const administrerFormation = useCallback(
    async (action: (fid: string, titre: string) => Promise<boolean>) => {
      if (!formation) return;
      const fait = await action(formation.id, formation.titre);
      if (fait) naviguerEtFermer({ nom: "catalogue" });
    },
    [formation, naviguerEtFermer],
  );

  /** Coche optimiste avec retour arrière visible si l'API échoue (U-R3). */
  const basculerFaite = useCallback(async () => {
    if (!lecon) return;
    const cible = !lecon.faite;
    setErreurCoche(null);
    setLecon({ ...lecon, faite: cible });
    try {
      const reponse = cible
        ? await api.cocher(lecon.formationId, lecon.leconId)
        : await api.decocher(lecon.formationId, lecon.leconId);
      setFormation((courante) =>
        courante && courante.id === lecon.formationId
          ? { ...courante, avancement: reponse.avancement }
          : courante,
      );
      void api.catalogue().then(setCatalogue).catch(() => undefined);
    } catch (cause: unknown) {
      setLecon((courante) =>
        courante && courante.leconId === lecon.leconId
          ? { ...courante, faite: !cible }
          : courante,
      );
      setErreurCoche(
        cause instanceof Error
          ? `Progression non enregistrée : ${cause.message}`
          : "Progression non enregistrée",
      );
    }
  }, [lecon]);

  /**
   * Bascule d'un critère (CR-R6). Rend `false` quand le serveur refuse : la
   * page leçon remet alors la case dans son état d'avant. Un 404 signifie que
   * la leçon a changé sur le disque — on la recharge plutôt que d'insister.
   */
  const basculerCritere = useCallback(
    async (critereId: string, coche: boolean): Promise<boolean> => {
      if (!lecon) return false;
      setErreurCoche(null);
      try {
        const reponse = await api.basculerCritere(
          lecon.formationId,
          lecon.leconId,
          critereId,
          coche,
        );
        setLecon((courante) =>
          courante && courante.leconId === lecon.leconId
            ? { ...courante, faite: reponse.faite, criteres: reponse.criteres }
            : courante,
        );
        setFormation((courante) =>
          courante && courante.id === lecon.formationId
            ? { ...courante, avancement: reponse.avancement }
            : courante,
        );
        void api.catalogue().then(setCatalogue).catch(() => undefined);
        return true;
      } catch (cause: unknown) {
        if (cause instanceof ErreurApi && cause.statut === 404) {
          setErreurCoche("Cette leçon a changé — contenu rechargé.");
          // Discret : recharger avec squelette ferait clignoter l'écran et
          // masquerait le message qu'on vient d'afficher.
          void charger(true);
          return false;
        }
        setErreurCoche(
          cause instanceof Error
            ? `Critère non enregistré : ${cause.message}`
            : "Critère non enregistré",
        );
        return false;
      }
    },
    [lecon, charger],
  );

  const nettoyer = useCallback(async () => {
    if (!formation) return;
    const nombre = formation.avancement.orphelines.length;
    const confirme = window.confirm(
      `Supprimer ${nombre} progression${nombre > 1 ? "s" : ""} de leçon${nombre > 1 ? "s" : ""} qui ne ${nombre > 1 ? "sont" : "est"} plus au programme ?`,
    );
    if (!confirme) return;
    const reponse = await api.nettoyer(formation.id);
    setFormation({ ...formation, avancement: reponse.avancement });
  }, [formation]);

  const reinitialiser = useCallback(async () => {
    if (!formation) return;
    const confirme = window.confirm(
      `Réinitialiser toute la progression de « ${formation.titre} » ? Cette action est définitive.`,
    );
    if (!confirme) return;
    const reponse = await api.reinitialiser(formation.id);
    setFormation({ ...formation, avancement: reponse.avancement });
    setLecon((courante) => (courante ? { ...courante, faite: false } : courante));
    void api.catalogue().then(setCatalogue).catch(() => undefined);
  }, [formation]);

  const proprietesRail = {
    route,
    naviguer: naviguerEtFermer,
    catalogue,
    formation,
    leconCourante: lid,
    criteresCourants:
      lecon && lecon.criteres.length > 0
        ? {
            faits: lecon.criteres.filter((critere) => critere.coche).length,
            total: lecon.criteres.length,
          }
        : null,
    recherche,
    mode,
    basculerMode,
    replie,
    basculerReplie,
    compte,
    surDeconnexion,
  };

  return (
    <div className={`app p-${mode}`}>
      {tiroirOuvert ? (
        <>
          <button
            type="button"
            className="voile-tiroir"
            aria-label="Fermer le sommaire"
            onClick={() => setTiroirOuvert(false)}
          />
          <ColonneLaterale
            {...proprietesRail}
            enTiroir
            fermerTiroir={() => setTiroirOuvert(false)}
          />
        </>
      ) : (
        <ColonneLaterale {...proprietesRail} />
      )}

      <main className="principal">
        <button
          type="button"
          className="bouton-tiroir"
          onClick={() => setTiroirOuvert(true)}
        >
          <Icone nom="list" taille={16} />
          Sommaire
        </button>

        {route.nom === "catalogue" ? (
          <Catalogue
            catalogue={catalogue}
            chargement={chargement}
            erreur={erreur}
            recharger={() => void charger()}
            naviguer={naviguerEtFermer}
            administration={administration}
          />
        ) : route.nom === "formation" ? (
          <PageFormation
            formation={formation}
            chargement={chargement}
            erreur={erreur}
            naviguer={naviguerEtFermer}
            surNettoyer={() => void nettoyer()}
            surReinitialiser={() => void reinitialiser()}
            occupe={administration.occupe}
            surArchiver={() => void administrerFormation(administration.archiver)}
            surSupprimer={() =>
              void administrerFormation((fid, titre) =>
                administration.supprimer(fid, titre),
              )
            }
          />
        ) : route.nom === "profil" ? (
          <Profil
            compte={compte}
            surCompteChange={surCompteChange}
            naviguer={naviguerEtFermer}
          />
        ) : route.nom === "comptes" ? (
          <ConsoleComptes moi={compte} />
        ) : route.nom === "administration" ? (
          <Administration fid={null} naviguer={naviguerEtFermer} />
        ) : route.nom === "structure" ? (
          <Administration fid={route.fid} naviguer={naviguerEtFermer} />
        ) : route.nom === "editer" ? (
          <EditeurLecon fid={route.fid} lid={route.lid} naviguer={naviguerEtFermer} />
        ) : route.nom === "lecon" ? (
          <PageLecon
            lecon={lecon}
            chargement={chargement}
            erreur={erreur}
            erreurCoche={erreurCoche}
            naviguer={naviguerEtFermer}
            surBasculerFaite={() => void basculerFaite()}
            surBasculerCritere={basculerCritere}
          />
        ) : (
          <div className="page">
            <h1>Page introuvable</h1>
            <button
              type="button"
              className="bouton bouton-petit"
              style={{ alignSelf: "flex-start" }}
              onClick={() => naviguer({ nom: "catalogue" })}
            >
              Retour au catalogue
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

/** Exporté pour les tests : seuil de bascule mobile (U-R6). */
export const SEUIL_RESPONSIVE = SEUIL_MOBILE;
