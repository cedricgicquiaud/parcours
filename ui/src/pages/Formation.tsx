import { useMemo, useState } from "react";
import type { ReponseFormation } from "../api";
import { urlAsset } from "../assets";
import { formaterDuree } from "../duree";
import {
  Bandeau,
  Barre,
  BlocErreur,
  Icone,
  LeconEtat,
  LienInterne,
  ModuleRepliable,
  Squelette,
} from "../composants/communs";
import { useModulesReplies } from "../preferences";
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

/**
 * Sommaire de la fiche : chaque module se replie, et le pli est le même que
 * dans le rail — une seule mémoire par formation (localStorage).
 */
function SommaireFiche({
  formation,
  naviguer,
}: {
  formation: ReponseFormation;
  naviguer: (route: Route) => void;
}) {
  const { estReplie, basculer } = useModulesReplies(formation.id);
  return (
    <div className="fiche-sommaire">
      <span className="kicker-faible">SOMMAIRE</span>
      {formation.avancement.modules.map((module, index) => (
        <ModuleRepliable
          key={module.id}
          className="module-fiche"
          ouvert={!estReplie(module.id)}
          surBascule={() => basculer(module.id)}
          enTete={
            <>
              <span className="module-entete-texte">
                <span className="module-kicker">
                  Module {String(index + 1).padStart(2, "0")}
                </span>
                <span className="module-titre">{module.titre}</span>
              </span>
              <span className="module-compteur">
                {module.faites}/{module.total}
                {module.duree !== undefined ? ` · ${formaterDuree(module.duree)}` : ""}
              </span>
            </>
          }
        >
          {module.description ? (
            <p className="module-description">{module.description}</p>
          ) : null}
          {module.lecons.map((lecon) => (
            <LienInterne
              key={lecon.id}
              className="ligne-lecon"
              route={{ nom: "lecon", fid: formation.id, lid: lecon.id }}
              naviguer={naviguer}
            >
              <LeconEtat faite={lecon.faite} />
              <span className="ligne-lecon-texte">
                <span className="ligne-lecon-titre">{lecon.titre}</span>
                {lecon.duree !== undefined ? (
                  <span className="ligne-lecon-meta">{formaterDuree(lecon.duree)}</span>
                ) : null}
              </span>
            </LienInterne>
          ))}
        </ModuleRepliable>
      ))}
    </div>
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
  peutEcrire = false,
  surCouverture,
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
  /**
   * Administrateur avec l'édition allumée (ED-R7). Conditionne tous les gestes
   * qui touchent au dossier de la formation — jamais ceux de la progression.
   */
  peutEcrire?: boolean;
  surCouverture?: (fichier: File) => Promise<void>;
}) {
  const [couvertureCassee, setCouvertureCassee] = useState(false);
  const [erreurCouverture, setErreurCouverture] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
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
      <header className="fiche-entete">
        <div className="fiche-entete-texte">
          <nav className="fil-ariane" aria-label="Fil d'Ariane">
            <a
              href="/"
              onClick={(evenement) => {
                evenement.preventDefault();
                naviguer({ nom: "catalogue" });
              }}
            >
              Mes formations
            </a>
          </nav>

          <h1>{formation.titre}</h1>

          {/* Sous le titre, là où l'œil lit — pas sous le visuel (recette
              2026-08-19). */}
          <div className="fiche-metas">
            <span className="meta-faible">
              {avancement.total} leçon{avancement.total > 1 ? "s" : ""}
              {formation.duree !== undefined
                ? ` · ${formaterDuree(formation.duree)}`
                : ""}
              {` · ${avancement.faites}/${avancement.total} fait`}
              {avancement.faites > 1 ? "s" : ""}
            </span>
            <Barre pourcentage={avancement.pourcentage} epaisse />
          </div>

          {formation.description ? (
            <p className="fiche-promesse">{formation.description}</p>
          ) : null}

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
        </div>

        <div className="fiche-entete-visuel">
          {formation.couverture && !couvertureCassee ? (
            <img
              className="couverture-formation"
              src={urlAsset(formation.id, formation.couverture)}
              alt={formation.titre}
              // FI-R12 : une couverture introuvable disparaît, elle ne laisse
              // pas de cadre vide en tête de fiche.
              onError={() => setCouvertureCassee(true)}
            />
          ) : null}

      {peutEcrire && surCouverture ? (
        <div className="couverture-depot">
          <label
            htmlFor="champ-couverture"
            className="bouton bouton-petit bouton-neutre"
          >
            <Icone nom="image" taille={14} />
            {formation.couverture ? "Changer la couverture" : "Ajouter une couverture"}
          </label>
          {/* Le champ natif est laid et n'a rien à faire en tête de fiche : le
              label lui sert de bouton, il reste atteignable au clavier. */}
          <input
            id="champ-couverture"
            type="file"
            className="visuellement-cache"
            accept="image/png,image/jpeg,image/gif,image/webp"
            disabled={envoiEnCours}
            onChange={(evenement) => {
              const fichier = evenement.target.files?.[0];
              evenement.target.value = "";
              if (!fichier) return;
              setErreurCouverture(null);
              setEnvoiEnCours(true);
              void surCouverture(fichier)
                .then(() => setCouvertureCassee(false))
                .catch((cause: unknown) => {
                  // La couverture précédente reste en place (FI-R16).
                  setErreurCouverture(
                    cause instanceof Error ? cause.message : "envoi impossible",
                  );
                })
                .finally(() => setEnvoiEnCours(false));
            }}
          />
          {envoiEnCours ? <span className="meta-faible">envoi…</span> : null}
        </div>
      ) : null}

          {erreurCouverture ? (
            <Bandeau icone="warning">{erreurCouverture}</Bandeau>
          ) : null}
        </div>
      </header>

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

      <SommaireFiche formation={formation} naviguer={naviguer} />

      {peutEcrire ? (
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
      ) : null}

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
