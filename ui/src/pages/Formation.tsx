import { useMemo, useState } from "react";
import type { ReponseFormation } from "../api";
import { formaterDuree } from "../duree";
import {
  Bandeau,
  Barre,
  BlocErreur,
  Icone,
  Squelette,
} from "../composants/communs";
import type { Route } from "../routeur";

/** Une liste de la fiche : objectifs, prérequis. Absente ou vide → rien (FI-R11). */
function ListeFiche({
  titre,
  entrees,
}: {
  titre: string;
  entrees?: string[];
}) {
  if (!entrees || entrees.length === 0) return null;
  const identifiant = titre.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <section className="fiche-bloc">
      <span className="kicker-faible" id={identifiant}>
        {titre}
      </span>
      <ul className="fiche-liste" aria-labelledby={identifiant}>
        {entrees.map((entree) => (
          <li key={entree}>{entree}</li>
        ))}
      </ul>
    </section>
  );
}

const LIBELLES_ACTION = {
  commencer: "Commencer",
  reprendre: "Reprendre",
  revoir: "Revoir la formation",
} as const;

export function PageFormation({
  formation,
  chargement,
  erreur,
  naviguer,
  surNettoyer,
  surReinitialiser,
  surArchiver,
  surSupprimer,
  occupe = false,
}: {
  formation: ReponseFormation | null;
  chargement: boolean;
  erreur: string | null;
  naviguer: (route: Route) => void;
  surNettoyer: () => void;
  surReinitialiser: () => void;
  surArchiver?: () => void;
  surSupprimer?: () => void;
  occupe?: boolean;
}) {
  const [couvertureCassee, setCouvertureCassee] = useState(false);
  // Référence stable : React compare l'objet, pas la chaîne — sans mémo, le
  // contenu serait réinjecté à chaque rendu (régression corrigée en phase 05).
  const presentation = useMemo(
    () => ({ __html: formation?.presentationHtml ?? "" }),
    [formation?.presentationHtml],
  );

  if (erreur) {
    return (
      <div className="page">
        <BlocErreur
          titre="Cette formation ne peut pas être ouverte"
          message={erreur}
          action={
            <button
              type="button"
              className="bouton bouton-petit"
              onClick={() => naviguer({ nom: "catalogue" })}
            >
              Retour au catalogue
            </button>
          }
        />
      </div>
    );
  }

  if (!formation || chargement) {
    return (
      <div className="page">
        <Squelette largeur="45%" hauteur={26} />
        <Squelette largeur="70%" />
        <Squelette largeur="55%" />
      </div>
    );
  }

  const { avancement } = formation;

  return (
    <div className="page">
      {formation.couverture && !couvertureCassee ? (
        <img
          className="couverture-formation"
          src={`/api/formations/${encodeURIComponent(formation.id)}/assets/${formation.couverture.replace(/^assets\//, "")}`}
          alt={formation.titre}
          // FI-R12 : une couverture introuvable disparaît, elle ne laisse pas
          // de cadre vide au sommet de la fiche.
          onError={() => setCouvertureCassee(true)}
        />
      ) : null}

      <div className="titre-page">
        <h1>{formation.titre}</h1>
        <span className="meta-faible">
          {avancement.faites}/{avancement.total} leçons — {avancement.pourcentage} %
          {formation.duree !== undefined ? ` — ${formaterDuree(formation.duree)}` : ""}
        </span>
      </div>

      {formation.description ? (
        <p
          style={{
            margin: 0,
            maxWidth: "66ch",
            fontSize: 15.5,
            lineHeight: 1.6,
            color: "var(--muted)",
            textWrap: "pretty",
          }}
        >
          {formation.description}
        </p>
      ) : null}

      <div className="barre-ligne" style={{ maxWidth: 420 }}>
        <Barre pourcentage={avancement.pourcentage} epaisse />
      </div>

      {formation.presentationHtml ? (
        <section className="fiche-bloc">
          <span className="kicker-faible">À PROPOS</span>
          <div
            className="contenu-lecon"
            // HTML déjà assaini par le serveur (A-R5).
            dangerouslySetInnerHTML={presentation}
          />
        </section>
      ) : null}

      <ListeFiche titre="CE QUE VOUS SAUREZ FAIRE" entrees={formation.objectifs} />
      <ListeFiche titre="AVANT DE COMMENCER" entrees={formation.prerequis} />

      {avancement.prochaine ? (
        <button
          type="button"
          className="bouton"
          style={{ alignSelf: "flex-start" }}
          onClick={() =>
            naviguer({
              nom: "lecon",
              fid: formation.id,
              lid: avancement.prochaine!.id,
            })
          }
        >
          {LIBELLES_ACTION[avancement.action]} — {avancement.prochaine.titre}
          <Icone nom="arrow-right" />
        </button>
      ) : null}

      {avancement.orphelines.length > 0 ? (
        <Bandeau
          actions={
            <button type="button" className="bouton bouton-petit" onClick={surNettoyer}>
              Nettoyer
            </button>
          }
        >
          {avancement.orphelines.length} leçon
          {avancement.orphelines.length > 1 ? "s" : ""} cochée
          {avancement.orphelines.length > 1 ? "s" : ""} ne{" "}
          {avancement.orphelines.length > 1 ? "sont" : "est"} plus au programme.
        </Bandeau>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <span className="kicker-faible">SOMMAIRE</span>
        {avancement.modules.map((module, index) => (
          <section
            key={module.id}
            className="carte"
            style={{ background: "transparent", borderStyle: "solid" }}
          >
            <div className="module-entete" style={{ padding: 0 }}>
              <span className="module-titre">
                {String(index + 1).padStart(2, "0")} · {module.titre}
              </span>
              <span className="module-compteur">
                {module.faites}/{module.total}
                {module.duree !== undefined ? ` · ${formaterDuree(module.duree)}` : ""}
              </span>
            </div>
            {module.description ? (
              <p className="module-description">{module.description}</p>
            ) : null}
            {module.lecons.map((lecon) => (
              <a
                key={lecon.id}
                className="ligne-lecon"
                href={`/formation/${encodeURIComponent(formation.id)}/lecon/${encodeURIComponent(lecon.id)}`}
                onClick={(evenement) => {
                  evenement.preventDefault();
                  naviguer({ nom: "lecon", fid: formation.id, lid: lecon.id });
                }}
              >
                {lecon.faite ? (
                  <Icone nom="check" taille={13} />
                ) : (
                  <span className="pastille" />
                )}
                <span className="ligne-lecon-titre">{lecon.titre}</span>
                {lecon.duree !== undefined ? (
                  <span className="ligne-lecon-duree">{formaterDuree(lecon.duree)}</span>
                ) : null}
              </a>
            ))}
          </section>
        ))}
      </div>

      <div className="actions-formulaire">
        <button
          type="button"
          className="bouton bouton-petit bouton-neutre"
          onClick={() => naviguer({ nom: "structure", fid: formation.id })}
        >
          <Icone nom="pencil-simple" taille={14} />
          Modifier la structure
        </button>
        {surArchiver ? (
          <button
            type="button"
            className="bouton bouton-petit bouton-neutre"
            disabled={occupe}
            onClick={surArchiver}
          >
            <Icone nom="archive" taille={14} />
            Archiver
          </button>
        ) : null}
        {surSupprimer ? (
          <button
            type="button"
            className="bouton bouton-petit bouton-neutre"
            disabled={occupe}
            onClick={surSupprimer}
          >
            <Icone nom="trash" taille={14} />
            Mettre à la corbeille
          </button>
        ) : null}
      </div>

      <button
        type="button"
        className="lien"
        onClick={surReinitialiser}
        style={{
          alignSelf: "flex-start",
          background: "none",
          border: 0,
          padding: 0,
          fontSize: 12.5,
          color: "var(--faint)",
          cursor: "pointer",
        }}
      >
        Réinitialiser ma progression
      </button>

    </div>
  );
}
