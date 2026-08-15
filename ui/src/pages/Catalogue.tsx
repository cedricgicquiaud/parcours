import type { CarteFormation, CarteFormationValide } from "../../../server/types-api";
import type { ReponseCatalogue } from "../api";
import {
  Bandeau,
  Barre,
  BlocErreur,
  Icone,
  PiedPlateforme,
  Squelette,
} from "../composants/communs";
import type { Route } from "../routeur";

const LIBELLES_ACTION = {
  commencer: "Commencer",
  reprendre: "Reprendre",
  revoir: "Revoir",
} as const;

export function Catalogue({
  catalogue,
  chargement,
  erreur,
  recharger,
  naviguer,
}: {
  catalogue: ReponseCatalogue | null;
  chargement: boolean;
  erreur: string | null;
  recharger: () => void;
  naviguer: (route: Route) => void;
}) {
  if (erreur) {
    return (
      <div className="page">
        <h1 style={{ margin: 0, font: "500 32px/1.15 var(--font)" }}>Mes formations</h1>
        <BlocErreur
          titre="Parcours ne répond pas"
          message={erreur}
          action={
            <button type="button" className="bouton bouton-petit" onClick={recharger}>
              Réessayer
            </button>
          }
        />
        <PiedPlateforme />
      </div>
    );
  }

  if (chargement && !catalogue) {
    return (
      <div className="page">
        <div className="titre-page">
          <h1>Mes formations</h1>
        </div>
        <div className="carte" style={{ minHeight: 148, gap: 14 }}>
          <Squelette largeur="40%" hauteur={18} />
          <Squelette largeur="80%" />
          <Squelette largeur="60%" />
        </div>
        <div className="grille-formations">
          <div className="carte squelette-carte" />
          <div className="carte squelette-carte" />
          <div className="carte squelette-carte" />
        </div>
        <PiedPlateforme />
      </div>
    );
  }

  const formations = catalogue?.formations ?? [];
  const valides = formations.filter(
    (formation): formation is CarteFormationValide => formation.statut === "valide",
  );
  const enCours =
    valides.find((formation) => formation.action === "reprendre") ?? null;
  const autres = formations.filter((formation) => formation !== enCours);
  const totalLecons = valides.reduce((total, formation) => total + formation.lecons, 0);

  return (
    <div className="page">
      <div className="titre-page">
        <h1>Mes formations</h1>
        <span className="meta-faible">
          {valides.length} formation{valides.length > 1 ? "s" : ""} · {totalLecons} leçon
          {totalLecons > 1 ? "s" : ""}
        </span>
        <button
          type="button"
          className="bouton bouton-petit"
          style={{ marginLeft: "auto" }}
          onClick={() => naviguer({ nom: "administration" })}
        >
          <Icone nom="plus" taille={14} />
          Nouvelle formation
        </button>
      </div>

      {catalogue?.progressionReinitialisee ? (
        <Bandeau icone="warning">
          Progression réinitialisée (base corrompue sauvegardée).
        </Bandeau>
      ) : null}

      {catalogue?.erreurGlobale ? (
        <Bandeau icone="warning">{catalogue.erreurGlobale}</Bandeau>
      ) : null}

      {enCours ? <CarteEnCours formation={enCours} naviguer={naviguer} /> : null}

      {formations.length === 0 ? (
        <div className="etat-vide">
          <strong style={{ color: "var(--text)", fontWeight: 500 }}>
            Aucune formation.
          </strong>
          <span>
            Créez-en une ici, ou déposez un dossier dans <code>formations/</code> :
            un <code>formation.json</code> et des fichiers markdown suffisent.
          </span>
          <button
            type="button"
            className="bouton bouton-petit"
            onClick={() => naviguer({ nom: "administration" })}
          >
            <Icone nom="plus" taille={14} />
            Créer une formation
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <span className="kicker-faible">TOUTES MES FORMATIONS</span>
          <div className="grille-formations">
            {autres.map((formation) => (
              <Carte key={formation.id} formation={formation} naviguer={naviguer} />
            ))}
            <div className="carte-vide">
              <span style={{ maxWidth: "20ch" }}>
                Déposez un dossier dans <code>formations/</code>
              </span>
            </div>
          </div>
        </div>
      )}

      <PiedPlateforme />
    </div>
  );
}

function CarteEnCours({
  formation,
  naviguer,
}: {
  formation: CarteFormationValide;
  naviguer: (route: Route) => void;
}) {
  const reprendre = () => {
    if (formation.prochaine) {
      naviguer({ nom: "lecon", fid: formation.id, lid: formation.prochaine.id });
    }
  };

  return (
    <section className="carte-en-cours">
      <div className="carte-en-cours-gauche">
        <span className="kicker">EN COURS</span>
        <h2>
          <a
            href={`/formation/${encodeURIComponent(formation.id)}`}
            onClick={(evenement) => {
              evenement.preventDefault();
              naviguer({ nom: "formation", fid: formation.id });
            }}
          >
            {formation.titre}
          </a>
        </h2>
        {formation.description ? <p>{formation.description}</p> : null}
        <div className="barre-ligne" style={{ marginTop: 2 }}>
          <div style={{ flex: 1, maxWidth: 300 }}>
            <Barre pourcentage={formation.pourcentage} epaisse />
          </div>
          <span className="meta-faible" style={{ fontSize: 12.5 }}>
            {formation.faites} leçons sur {formation.lecons} — {formation.pourcentage} %
          </span>
        </div>
      </div>
      <div className="carte-en-cours-droite">
        <span className="kicker-faible">PROCHAINE LEÇON</span>
        <span style={{ fontSize: 14.5 }}>
          {formation.prochaine
            ? `${formation.prochaine.moduleTitre} · ${formation.prochaine.titre}`
            : "—"}
        </span>
        <button
          type="button"
          className="bouton"
          style={{ marginTop: 8 }}
          onClick={reprendre}
        >
          Reprendre
          <Icone nom="arrow-right" />
        </button>
      </div>
    </section>
  );
}

function Carte({
  formation,
  naviguer,
}: {
  formation: CarteFormation;
  naviguer: (route: Route) => void;
}) {
  if (formation.statut === "invalide") {
    return (
      <div className="carte carte-invalide">
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Icone nom="warning" taille={15} />
          <code>{formation.id}</code>
        </div>
        <p>{formation.erreur}</p>
        <span className="meta-faible" style={{ marginTop: "auto", fontSize: 12 }}>
          Corrigez le manifeste, puis rechargez.
        </span>
      </div>
    );
  }

  const ouvrir = () => {
    if (formation.prochaine) {
      naviguer({ nom: "lecon", fid: formation.id, lid: formation.prochaine.id });
    }
  };

  return (
    <div className="carte">
      <a
        className="carte-titre"
        href={`/formation/${encodeURIComponent(formation.id)}`}
        onClick={(evenement) => {
          evenement.preventDefault();
          naviguer({ nom: "formation", fid: formation.id });
        }}
      >
        {formation.titre}
      </a>
      {formation.description ? <p>{formation.description}</p> : null}
      <Barre pourcentage={formation.pourcentage} epaisse />
      <div className="carte-pied">
        <span className="meta-faible" style={{ fontSize: 12 }}>
          {formation.faites}/{formation.lecons} leçons
        </span>
        <button
          type="button"
          className={`bouton bouton-petit${formation.action === "revoir" ? " bouton-neutre" : ""}`}
          style={{ marginLeft: "auto" }}
          onClick={ouvrir}
        >
          {LIBELLES_ACTION[formation.action]}
        </button>
      </div>
    </div>
  );
}
