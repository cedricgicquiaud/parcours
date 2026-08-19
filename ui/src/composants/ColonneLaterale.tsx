import { useEffect, useRef } from "react";
import type { Compte, ReponseCatalogue, ReponseFormation } from "../api";
import { useModulesReplies, type Mode } from "../preferences";
import { formaterDuree } from "../duree";
import { morceauxSurlignes, type EtatRecherche } from "../recherche";
import type { Route } from "../routeur";
import { Barre, Icone, LienInterne } from "./communs";

export interface ProprietesRail {
  route: Route;
  naviguer: (route: Route) => void;
  catalogue: ReponseCatalogue | null;
  formation: ReponseFormation | null;
  leconCourante: string | null;
  /** Décompte des critères de la leçon ouverte (CR-R9), sinon `null`. */
  criteresCourants: { faits: number; total: number } | null;
  recherche: EtatRecherche;
  mode: Mode;
  basculerMode: () => void;
  replie: boolean;
  basculerReplie: () => void;
  /** Compte connecté (P011) : son nom et ses actions vivent au pied du rail. */
  compte: Compte;
  surDeconnexion: () => void;
  /** Mode édition (ED-R3) : l'interrupteur n'existe que pour un administrateur. */
  edition: boolean;
  basculerEdition: () => void;
  /** Vrai quand le latéral est affiché en tiroir mobile (U-R6). */
  enTiroir?: boolean;
  fermerTiroir?: () => void;
}

export function ColonneLaterale(props: ProprietesRail) {
  const { formation, recherche, replie, basculerReplie } = props;
  const champ = useRef<HTMLInputElement>(null);
  const aUneFormation = formation !== null;
  const requeteEnCours = recherche.requete;
  const effacerRecherche = recherche.effacer;

  // Raccourcis clavier : « / » atteint le champ, « Échap » revient au sommaire.
  useEffect(() => {
    const surTouche = (evenement: KeyboardEvent) => {
      const cible = evenement.target as HTMLElement | null;
      const dansUnChamp =
        cible?.tagName === "INPUT" || cible?.tagName === "TEXTAREA";
      if (evenement.key === "/" && !dansUnChamp && aUneFormation) {
        evenement.preventDefault();
        if (replie) basculerReplie();
        window.setTimeout(() => champ.current?.focus(), 0);
      }
      if (evenement.key === "Escape" && requeteEnCours) {
        effacerRecherche();
        champ.current?.blur();
      }
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [aUneFormation, replie, basculerReplie, requeteEnCours, effacerRecherche]);

  if (replie && !props.enTiroir) return <Spine {...props} />;

  return (
    <aside
      className={props.enTiroir ? "rail rail-tiroir" : "rail"}
      aria-label="Navigation de la formation"
    >
      <div className="rail-entete">
        <div className="rail-marque">
          <LienInterne route={{ nom: "catalogue" }} naviguer={props.naviguer}>
            <span className="marque-carre" />
            <span className="marque-nom">Parcours</span>
          </LienInterne>
          <button
            type="button"
            className="bouton-icone"
            style={{ marginLeft: "auto" }}
            onClick={props.enTiroir ? props.fermerTiroir : props.basculerReplie}
            title="Replier le sommaire"
            aria-label="Replier le sommaire"
          >
            <Icone nom="sidebar-simple" taille={16} />
          </button>
        </div>

        {formation ? (
          <>
            <div className="rail-titre-formation">
              <LienInterne
                route={{ nom: "formation", fid: formation.id }}
                naviguer={props.naviguer}
              >
                {formation.titre}
              </LienInterne>
              <div className="barre-ligne">
                <Barre pourcentage={formation.avancement.pourcentage} />
                <span className="meta-faible">
                  {formation.avancement.faites}/{formation.avancement.total}
                </span>
              </div>
            </div>
            <ChampRecherche champ={champ} recherche={recherche} />
          </>
        ) : (
          <ResumeCatalogue catalogue={props.catalogue} />
        )}
      </div>

      {formation && recherche.active ? (
        <Resultats {...props} formation={formation} />
      ) : formation ? (
        <Sommaire {...props} formation={formation} />
      ) : (
        <ListeFormations {...props} />
      )}

      <div className="rail-compte">
        <LienInterne
          className="rail-compte-identite"
          route={{ nom: "profil" }}
          naviguer={props.naviguer}
        >
          <Icone nom="user-circle" taille={17} />
          <span className="rail-compte-nom">{props.compte.nom}</span>
        </LienInterne>
        {props.compte.role === "admin" ? (
          <LienInterne
            className="rail-compte-lien"
            route={{ nom: "comptes" }}
            title="Gérer les comptes"
            ariaLabel="Gérer les comptes"
            naviguer={props.naviguer}
          >
            <Icone nom="users-three" taille={15} />
          </LienInterne>
        ) : null}
        {props.compte.role === "admin" ? (
          <BoutonEdition
            edition={props.edition}
            basculer={props.basculerEdition}
            taille={15}
          />
        ) : null}
        <button
          type="button"
          className="rail-compte-lien"
          onClick={props.basculerMode}
          title={props.mode === "sombre" ? "Passer en mode clair" : "Passer en mode sombre"}
          aria-label={
            props.mode === "sombre" ? "Passer en mode clair" : "Passer en mode sombre"
          }
        >
          <Icone nom={props.mode === "sombre" ? "sun" : "moon"} taille={15} />
        </button>
        <button
          type="button"
          className="rail-compte-lien"
          title="Se déconnecter"
          aria-label="Se déconnecter"
          onClick={props.surDeconnexion}
        >
          <Icone nom="sign-out" taille={15} />
        </button>
      </div>
    </aside>
  );
}

/**
 * Interrupteur « Édition » (ED-R12, ED-R13). Éteint, Parcours est un lecteur ;
 * allumé, les outils d'auteur reviennent. Le libellé dit l'état, pas seulement
 * la fonction : c'est lui qu'annonce un lecteur d'écran.
 */
function BoutonEdition({
  edition,
  basculer,
  taille,
  classe = "rail-compte-lien",
}: {
  edition: boolean;
  basculer: () => void;
  taille: number;
  classe?: string;
}) {
  const libelle = edition ? "Désactiver l'édition" : "Activer l'édition";
  return (
    <button
      type="button"
      className={edition ? `${classe} actif` : classe}
      aria-pressed={edition}
      title={libelle}
      aria-label={libelle}
      onClick={basculer}
    >
      <Icone nom="pencil-simple" taille={taille} />
    </button>
  );
}

function ResumeCatalogue({ catalogue }: { catalogue: ReponseCatalogue | null }) {
  const valides = (catalogue?.formations ?? []).filter(
    (formation) => formation.statut === "valide",
  );
  const lecons = valides.reduce((total, formation) => total + formation.lecons, 0);
  const faites = valides.reduce((total, formation) => total + formation.faites, 0);
  return (
    <div className="rail-resume">
      <span className="rail-resume-titre">Mes formations</span>
      <span className="rail-resume-detail">
        {valides.length} formation{valides.length > 1 ? "s" : ""} · {lecons} leçon
        {lecons > 1 ? "s" : ""} · {faites} terminée{faites > 1 ? "s" : ""}
      </span>
    </div>
  );
}

function ChampRecherche({
  champ,
  recherche,
}: {
  champ: React.RefObject<HTMLInputElement | null>;
  recherche: EtatRecherche;
}) {
  return (
    <div className="champ-recherche" role="search">
      <Icone nom="magnifying-glass" taille={14} />
      <input
        ref={champ}
        type="search"
        value={recherche.requete}
        placeholder="Rechercher"
        aria-label="Rechercher dans cette formation"
        onChange={(evenement) => recherche.setRequete(evenement.target.value)}
      />
      {recherche.requete ? (
        <button
          type="button"
          className="bouton-icone"
          onClick={recherche.effacer}
          aria-label="Effacer la recherche"
        >
          <Icone nom="x" taille={13} />
        </button>
      ) : (
        <span className="badge-touche" aria-hidden="true">
          /
        </span>
      )}
    </div>
  );
}

function Resultats(props: ProprietesRail & { formation: ReponseFormation }) {
  const { recherche, formation } = props;
  const reponse = recherche.reponse;

  return (
    <nav className="resultats" aria-label="Résultats de recherche">
      <span aria-live="polite" className="meta-faible" style={{ padding: "0 8px" }}>
        {recherche.chargement && !reponse
          ? "Recherche…"
          : reponse?.message
            ? reponse.message
            : reponse
              ? `${reponse.total} résultat${reponse.total > 1 ? "s" : ""}${
                  reponse.total > reponse.resultats.length
                    ? ` — ${reponse.resultats.length} premiers affichés`
                    : ""
                }`
              : ""}
      </span>

      {recherche.erreur ? (
        <span className="meta-faible" style={{ padding: "0 8px" }}>
          {recherche.erreur}
        </span>
      ) : null}

      {reponse && reponse.resultats.length === 0 && !reponse.message ? (
        <div style={{ padding: "0 8px", display: "grid", gap: 8 }}>
          <span className="meta-faible">
            Aucun résultat pour « {recherche.requete.trim()} »
          </span>
          <button type="button" className="lien meta-faible" onClick={recherche.effacer}>
            Effacer la recherche
          </button>
        </div>
      ) : null}

      {(reponse?.resultats ?? []).map((resultat) => (
        <LienInterne
          key={resultat.leconId}
          className="resultat"
          route={{ nom: "lecon", fid: formation.id, lid: resultat.leconId }}
          naviguer={props.naviguer}
        >
          <span className="resultat-titre">
            {estFaite(props.formation, resultat.leconId) ? (
              <Icone nom="check" taille={12} />
            ) : (
              <span className="pastille" />
            )}
            {resultat.titre}
          </span>
          <span className="resultat-extrait">
            {morceauxSurlignes(resultat.extrait, resultat.occurrences).map(
              (morceau, index) =>
                morceau.surligne ? (
                  <mark key={index}>{morceau.texte}</mark>
                ) : (
                  <span key={index}>{morceau.texte}</span>
                ),
            )}
          </span>
        </LienInterne>
      ))}

      {reponse && reponse.nonIndexees > 0 ? (
        <span className="meta-faible" style={{ padding: "0 8px" }}>
          {reponse.nonIndexees} leçon{reponse.nonIndexees > 1 ? "s" : ""} non indexée
          {reponse.nonIndexees > 1 ? "s" : ""} (fichier illisible)
        </span>
      ) : null}

      <span className="resultats-note">
        Échap revient au sommaire. Indices et solutions ne sont jamais indexés.
      </span>
    </nav>
  );
}

function estFaite(formation: ReponseFormation | null, leconId: string): boolean {
  return (formation?.avancement.modules ?? []).some((module) =>
    module.lecons.some((lecon) => lecon.id === leconId && lecon.faite),
  );
}

function Sommaire(props: ProprietesRail & { formation: ReponseFormation }) {
  const { formation, leconCourante } = props;
  const { estReplie, replier } = useModulesReplies(formation.id);
  return (
    <nav className="rail-nav" aria-label="Sommaire de la formation">
      {formation.avancement.modules.map((module, index) => (
        <details className="module" key={module.id} open={!estReplie(module.id)}>
          {/* Clic intercepté : l'état React pilote `open`, pour le mémoriser. */}
          <summary
            className="module-entete"
            onClick={(evenement) => {
              evenement.preventDefault();
              replier(module.id, !estReplie(module.id));
            }}
          >
            <span className="module-titre">
              {String(index + 1).padStart(2, "0")} · {module.titre}
              {/* Recette 2026-08-19 : la durée vit sur le module, pas sur
                  chaque leçon — le rail resterait illisible sinon. */}
              {module.duree !== undefined ? (
                <span className="ligne-lecon-duree" style={{ marginLeft: 6 }}>
                  {formaterDuree(module.duree)}
                </span>
              ) : null}
            </span>
            <span className="module-compteur">
              {module.faites}/{module.total}
            </span>
          </summary>
          {module.lecons.map((lecon) => (
            <LienInterne
              key={lecon.id}
              className={`ligne-lecon${lecon.id === leconCourante ? " courante" : ""}`}
              route={{ nom: "lecon", fid: formation.id, lid: lecon.id }}
              courante={lecon.id === leconCourante}
              naviguer={props.naviguer}
            >
              {lecon.faite ? (
                <Icone nom="check" taille={13} />
              ) : (
                <span className="pastille" />
              )}
              <span className="ligne-lecon-titre">{lecon.titre}</span>
              {lecon.id === leconCourante && props.criteresCourants ? (
                <span className="ligne-lecon-criteres">
                  {props.criteresCourants.faits}/{props.criteresCourants.total}
                </span>
              ) : null}
            </LienInterne>
          ))}
        </details>
      ))}
    </nav>
  );
}

function ListeFormations(props: ProprietesRail) {
  const formations = props.catalogue?.formations ?? [];
  return (
    <nav className="rail-nav rail-nav-formations" aria-label="Mes formations">
      {formations.map((formation) =>
        formation.statut === "valide" ? (
          <LienInterne
            key={formation.id}
            className="ligne-formation"
            route={{ nom: "formation", fid: formation.id }}
            naviguer={props.naviguer}
          >
            <span>{formation.titre}</span>
            <span className="barre-ligne">
              <Barre pourcentage={formation.pourcentage} />
              <span className="meta-faible">
                {formation.faites}/{formation.lecons}
              </span>
            </span>
          </LienInterne>
        ) : (
          <div key={formation.id} className="ligne-formation-invalide">
            <Icone nom="warning" taille={14} />
            <span>{formation.id}</span>
          </div>
        ),
      )}
    </nav>
  );
}

function Spine(props: ProprietesRail) {
  const { formation, leconCourante } = props;
  const lecons = (formation?.avancement.modules ?? []).flatMap(
    (module) => module.lecons,
  );

  return (
    <div className="spine">
      <LienInterne
        route={{ nom: "catalogue" }}
        title="Catalogue"
        ariaLabel="Catalogue"
        naviguer={props.naviguer}
      >
        <span className="spine-marque" />
      </LienInterne>
      <button
        type="button"
        className="bouton-icone"
        onClick={props.basculerReplie}
        title="Ouvrir le sommaire"
        aria-label="Ouvrir le sommaire"
      >
        <Icone nom="sidebar-simple" taille={17} />
      </button>

      {formation ? (
        <>
          <button
            type="button"
            className="spine-points"
            onClick={props.basculerReplie}
            title={`${formation.avancement.faites} leçons sur ${formation.avancement.total}`}
            aria-label="Ouvrir le sommaire"
          >
            {lecons.slice(0, 12).map((lecon) => (
              <span
                key={lecon.id}
                className={`spine-point${lecon.faite ? " faite" : ""}${
                  lecon.id === leconCourante ? " courante" : ""
                }`}
              />
            ))}
            {lecons.length > 12 ? <span className="spine-separateur" /> : null}
          </button>
          <span
            className="spine-pourcent"
            title={`${formation.avancement.pourcentage} % de la formation`}
          >
            {formation.avancement.pourcentage}&#8239;%
          </span>
        </>
      ) : null}

      <div className="spine-bas">
        {formation ? (
          <button
            type="button"
            className="bouton-icone"
            onClick={props.basculerReplie}
            aria-label="Rechercher dans cette formation"
          >
            <Icone nom="magnifying-glass" taille={16} />
          </button>
        ) : null}
        <LienInterne
          route={{ nom: "profil" }}
          className="bouton-icone"
          title={props.compte.nom}
          ariaLabel="Mon profil"
          naviguer={props.naviguer}
        >
          <Icone nom="user-circle" taille={16} />
        </LienInterne>
        {props.compte.role === "admin" ? (
          <BoutonEdition
            edition={props.edition}
            basculer={props.basculerEdition}
            taille={16}
            classe="bouton-icone"
          />
        ) : null}
        <button
          type="button"
          className="bouton-icone"
          onClick={props.basculerMode}
          aria-label={
            props.mode === "sombre" ? "Passer en mode clair" : "Passer en mode sombre"
          }
        >
          <Icone nom={props.mode === "sombre" ? "sun" : "moon"} taille={16} />
        </button>
      </div>
    </div>
  );
}
