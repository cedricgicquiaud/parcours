import { useState } from "react";
import type { CarteFormation, CarteFormationValide } from "../../../server/types-api";
import type { Administration } from "../administration";
import type { EntreeArchive, EntreeCorbeille, ReponseCatalogue } from "../api";
import {
  Bandeau,
  Barre,
  BlocErreur,
  Icone,
  Squelette,
} from "../composants/communs";
import { ZoneDepot } from "../composants/ZoneDepot";
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
  administration,
}: {
  catalogue: ReponseCatalogue | null;
  chargement: boolean;
  erreur: string | null;
  recharger: () => void;
  naviguer: (route: Route) => void;
  administration: Administration;
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
      </div>
    );
  }

  const formations = catalogue?.formations ?? [];
  const archivees = catalogue?.archivees ?? [];
  const corbeille = catalogue?.corbeille ?? [];
  const valides = formations.filter(
    (formation): formation is CarteFormationValide => formation.statut === "valide",
  );
  const enCours =
    valides.find((formation) => formation.action === "reprendre") ?? null;
  const autres = formations.filter((formation) => formation !== enCours);
  const totalLecons = valides.reduce((total, formation) => total + formation.lecons, 0);

  const actions = {
    modifier: (fid: string) => naviguer({ nom: "structure", fid }),
    archiver: administration.archiver,
    supprimer: administration.supprimer,
  };

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

      {administration.message ? (
        <Bandeau
          icone="check-circle"
          actions={
            <button
              type="button"
              className="bouton bouton-petit bouton-neutre"
              onClick={administration.effacer}
            >
              Fermer
            </button>
          }
        >
          {administration.message}
        </Bandeau>
      ) : null}

      {administration.erreur ? (
        <BlocErreur titre="Action impossible" message={administration.erreur} />
      ) : null}

      {enCours ? <CarteEnCours formation={enCours} naviguer={naviguer} /> : null}

      {formations.length === 0 ? (
        <div className="etat-vide">
          <strong style={{ color: "var(--text)", fontWeight: 500 }}>
            Aucune formation.
          </strong>
          <span>
            Déposez le dossier d'une formation existante, ou créez-en une de zéro.
          </span>
          <ZoneDepot surDepot={administration.importer} occupe={administration.occupe} />
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
              <Carte
                key={formation.id}
                formation={formation}
                naviguer={naviguer}
                actions={actions}
                occupe={administration.occupe}
              />
            ))}
            <ZoneDepot
              surDepot={administration.importer}
              occupe={administration.occupe}
              compacte
            />
          </div>
        </div>
      )}

      {archivees.length > 0 ? (
        <SectionRepliable titre="Archivées" nombre={archivees.length}>
          {archivees.map((archive) => (
            <LigneArchive
              key={archive.id}
              archive={archive}
              occupe={administration.occupe}
              surRestaurer={administration.restaurerArchive}
              surSupprimer={administration.supprimer}
            />
          ))}
        </SectionRepliable>
      ) : null}

      {corbeille.length > 0 ? (
        <SectionRepliable titre="Corbeille" nombre={corbeille.length}>
          <p className="note-corbeille">
            Parcours ne supprime aucun fichier : ces dossiers sont déplacés dans{" "}
            <code>formations/.corbeille/</code>. Videz-la vous-même depuis le Finder.
          </p>
          {corbeille.map((entree) => (
            <LigneCorbeille
              key={entree.entree}
              entree={entree}
              occupe={administration.occupe}
              surRestaurer={administration.restaurerCorbeille}
            />
          ))}
        </SectionRepliable>
      ) : null}

    </div>
  );
}

function SectionRepliable({
  titre,
  nombre,
  children,
}: {
  titre: string;
  nombre: number;
  children: React.ReactNode;
}) {
  const [ouverte, setOuverte] = useState(false);
  return (
    <section className="section-repliable">
      <button
        type="button"
        className="section-repliable-entete"
        aria-expanded={ouverte}
        onClick={() => setOuverte((valeur) => !valeur)}
      >
        <Icone nom={ouverte ? "caret-down" : "caret-right"} taille={13} />
        {titre}
        <span className="meta-faible">{nombre}</span>
      </button>
      {ouverte ? <div className="section-repliable-corps">{children}</div> : null}
    </section>
  );
}

function LigneArchive({
  archive,
  occupe,
  surRestaurer,
  surSupprimer,
}: {
  archive: EntreeArchive;
  occupe: boolean;
  surRestaurer: (fid: string, titre: string) => void;
  surSupprimer: (fid: string, titre: string, depuisArchives?: boolean) => void;
}) {
  const titre = archive.titre ?? archive.id;
  return (
    <div className="ligne-cycle">
      <div className="ligne-cycle-texte">
        <span className="ligne-cycle-titre">{titre}</span>
        <span className="meta-faible">
          {archive.statut === "invalide"
            ? `Manifeste refusé : ${archive.erreur}`
            : `${archive.lecons} leçon${(archive.lecons ?? 0) > 1 ? "s" : ""}`}
        </span>
      </div>
      <button
        type="button"
        className="bouton bouton-petit bouton-neutre"
        disabled={occupe}
        onClick={() => surRestaurer(archive.id, titre)}
      >
        Restaurer
      </button>
      <button
        type="button"
        className="bouton bouton-petit bouton-neutre"
        disabled={occupe}
        onClick={() => surSupprimer(archive.id, titre, true)}
      >
        Corbeille
      </button>
    </div>
  );
}

function LigneCorbeille({
  entree,
  occupe,
  surRestaurer,
}: {
  entree: EntreeCorbeille;
  occupe: boolean;
  surRestaurer: (entree: string, titre: string) => void;
}) {
  const titre = entree.titre ?? entree.id;
  return (
    <div className="ligne-cycle">
      <div className="ligne-cycle-texte">
        <span className="ligne-cycle-titre">{titre}</span>
        <span className="meta-faible">
          Mise à la corbeille le{" "}
          {new Date(entree.supprimeeLe).toLocaleString("fr-FR", {
            dateStyle: "long",
            timeStyle: "short",
          })}
        </span>
      </div>
      <button
        type="button"
        className="bouton bouton-petit bouton-neutre"
        disabled={occupe}
        onClick={() => surRestaurer(entree.entree, titre)}
      >
        Restaurer
      </button>
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

interface ActionsCarte {
  modifier: (fid: string) => void;
  archiver: (fid: string, titre: string) => void;
  supprimer: (fid: string, titre: string) => void;
}

/** Bandeau de couverture d'une carte (FI-R13) — rien du tout s'il n'y en a pas. */
function Couverture({ formation }: { formation: CarteFormationValide }) {
  const [cassee, setCassee] = useState(false);
  if (!formation.couverture || cassee) return null;
  return (
    <img
      className="carte-couverture"
      src={`/api/formations/${encodeURIComponent(formation.id)}/assets/${formation.couverture.replace(/^assets\//, "")}`}
      alt={formation.titre}
      onError={() => setCassee(true)}
    />
  );
}

function Carte({
  formation,
  naviguer,
  actions,
  occupe,
}: {
  formation: CarteFormation;
  naviguer: (route: Route) => void;
  actions: ActionsCarte;
  occupe: boolean;
}) {
  const titre = formation.statut === "valide" ? formation.titre : formation.id;

  if (formation.statut === "invalide") {
    return (
      <div className="carte carte-invalide">
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Icone nom="warning" taille={15} />
          <code>{formation.id}</code>
        </div>
        <p>{formation.erreur}</p>
        <div className="carte-pied" style={{ marginTop: "auto" }}>
          <span className="meta-faible" style={{ fontSize: 12 }}>
            Corrigez le manifeste, puis rechargez.
          </span>
          <MenuCarte
            titre={titre}
            fid={formation.id}
            actions={actions}
            occupe={occupe}
            modifiable={false}
          />
        </div>
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
      <Couverture formation={formation} />
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
        <MenuCarte
          titre={titre}
          fid={formation.id}
          actions={actions}
          occupe={occupe}
          modifiable
        />
        <button
          type="button"
          className={`bouton bouton-petit${formation.action === "revoir" ? " bouton-neutre" : ""}`}
          onClick={ouvrir}
        >
          {LIBELLES_ACTION[formation.action]}
        </button>
      </div>
    </div>
  );
}

/** Actions d'administration d'une carte — repliées pour ne pas charger l'écran. */
function MenuCarte({
  fid,
  titre,
  actions,
  occupe,
  modifiable,
}: {
  fid: string;
  titre: string;
  actions: ActionsCarte;
  occupe: boolean;
  modifiable: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);

  const declencher = (action: () => void) => () => {
    setOuvert(false);
    action();
  };

  return (
    <div className="menu-carte" style={{ marginLeft: "auto" }}>
      <button
        type="button"
        className="bouton-icone"
        aria-label={`Administrer « ${titre} »`}
        aria-expanded={ouvert}
        disabled={occupe}
        onClick={() => setOuvert((valeur) => !valeur)}
      >
        <Icone nom="dots-three" taille={16} />
      </button>
      {ouvert ? (
        <>
          <button
            type="button"
            className="voile-menu"
            aria-label="Fermer le menu"
            onClick={() => setOuvert(false)}
          />
          <div className="menu-carte-liste" role="menu">
            {modifiable ? (
              <button
                type="button"
                role="menuitem"
                onClick={declencher(() => actions.modifier(fid))}
              >
                <Icone nom="pencil-simple" taille={14} />
                Modifier la structure
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              onClick={declencher(() => actions.archiver(fid, titre))}
            >
              <Icone nom="archive" taille={14} />
              Archiver
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={declencher(() => actions.supprimer(fid, titre))}
            >
              <Icone nom="trash" taille={14} />
              Mettre à la corbeille
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
