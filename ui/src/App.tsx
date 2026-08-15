import { useCallback, useEffect, useState } from "react";
import { api, type ReponseCatalogue, type ReponseFormation, type ReponseLecon } from "./api";
import { ColonneLaterale } from "./composants/ColonneLaterale";
import { Icone } from "./composants/communs";
import { useMode, useRafraichirAuFocus, useRailReplie } from "./preferences";
import { Administration } from "./pages/Administration";
import { Catalogue } from "./pages/Catalogue";
import { EditeurLecon } from "./pages/EditeurLecon";
import { PageFormation } from "./pages/Formation";
import { PageLecon } from "./pages/Lecon";
import { useRecherche } from "./recherche";
import { useRoute, type Route } from "./routeur";

const SEUIL_MOBILE = 720;

export function App() {
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
      setErreur(cause instanceof Error ? cause.message : "erreur inconnue");
    } finally {
      setChargement(false);
    }
    // `route.nom` fait partie des dépendances : on passe de l'éditeur à la
    // leçon sans changer de formation ni de leçon, et le contenu doit malgré
    // tout être relu — sinon la leçon resterait affichée telle qu'avant
    // modification.
  }, [fid, lid, route.nom]);

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
    recherche,
    mode,
    basculerMode,
    replie,
    basculerReplie,
    surReinitialiser: () => void reinitialiser(),
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
          />
        ) : route.nom === "formation" ? (
          <PageFormation
            formation={formation}
            chargement={chargement}
            erreur={erreur}
            naviguer={naviguerEtFermer}
            surNettoyer={() => void nettoyer()}
            surReinitialiser={() => void reinitialiser()}
          />
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
