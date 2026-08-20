import type { ReactNode } from "react";
import { formaterDuree } from "../duree";
import { cheminDe, estClicSimple, type Route } from "../routeur";

/**
 * Lien de navigation interne : l'adresse vient du routeur (une seule source
 * de vérité), un clic simple navigue côté client, un clic modifié
 * (Cmd/Ctrl/Shift, bouton du milieu) garde le comportement du navigateur.
 */
export function LienInterne({
  route,
  naviguer,
  className,
  courante = false,
  title,
  ariaLabel,
  children,
}: {
  route: Route;
  naviguer: (route: Route) => void;
  className?: string;
  /** Vrai pour la page affichée : pose `aria-current="page"`. */
  courante?: boolean;
  title?: string;
  /** Pour un lien-icône sans texte visible. */
  ariaLabel?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={cheminDe(route)}
      className={className}
      title={title}
      aria-label={ariaLabel}
      aria-current={courante ? "page" : undefined}
      onClick={(evenement) => {
        if (!estClicSimple(evenement)) return;
        evenement.preventDefault();
        naviguer(route);
      }}
    >
      {children}
    </a>
  );
}

export function Icone({ nom, taille }: { nom: string; taille?: number }) {
  return (
    <i
      className={`ph ph-${nom}`}
      aria-hidden="true"
      style={taille ? { fontSize: `${taille}px` } : undefined}
    />
  );
}

export function Barre({
  pourcentage,
  epaisse = false,
}: {
  pourcentage: number;
  epaisse?: boolean;
}) {
  return (
    <div className={epaisse ? "barre barre-epaisse" : "barre"}>
      <span style={{ width: `${pourcentage}%` }} />
    </div>
  );
}

export function Bandeau({
  icone = "warning",
  children,
  actions,
}: {
  icone?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="bandeau" role="status">
      <Icone nom={icone} taille={16} />
      <span>{children}</span>
      {actions ? <div className="bandeau-actions">{actions}</div> : null}
    </div>
  );
}

export function Squelette({
  largeur = "100%",
  hauteur = 12,
}: {
  largeur?: string;
  hauteur?: number;
}) {
  return <div className="squelette" style={{ width: largeur, height: hauteur }} />;
}

/**
 * Mention de non-affiliation (U-R8, révisée). Elle ne vit plus que sur les
 * écrans vus AVANT connexion — connexion et liens reçus par courriel : c'est
 * là qu'un tiers arrive, donc là qu'elle protège. La répéter sur les écrans
 * de travail n'ajoutait aucune protection et volait une ligne à chaque page.
 */
export function PiedPlateforme() {
  return (
    <footer className="pied-plateforme">
      Projet indépendant, non affilié à Anthropic.
    </footer>
  );
}

/**
 * En-tête à deux niveaux d'un module de sommaire (rail et fiche) :
 * un libellé discret « Module NN · durée », puis le titre qui se lit.
 */
export function EnTeteModule({
  numero,
  titre,
  duree,
  compteur,
}: {
  numero: number;
  titre: string;
  duree?: number;
  compteur: ReactNode;
}) {
  return (
    <>
      <span className="module-entete-texte">
        <span className="module-kicker">
          Module {String(numero).padStart(2, "0")}
          {duree !== undefined ? ` · ${formaterDuree(duree)}` : ""}
        </span>
        <span className="module-titre">{titre}</span>
      </span>
      <span className="module-compteur">{compteur}</span>
    </>
  );
}

/**
 * Ligne de leçon d'un sommaire : état rond, titre, puis métadonnées
 * (durée, décompte de critères de la leçon ouverte).
 */
export function LigneLecon({
  route,
  naviguer,
  courante = false,
  faite,
  titre,
  duree,
  criteres,
}: {
  route: Route;
  naviguer: (route: Route) => void;
  courante?: boolean;
  faite: boolean;
  titre: string;
  duree?: number;
  criteres?: { faits: number; total: number } | null;
}) {
  return (
    <LienInterne
      className={`ligne-lecon${courante ? " courante" : ""}`}
      route={route}
      courante={courante}
      naviguer={naviguer}
    >
      <LeconEtat faite={faite} />
      <span className="ligne-lecon-texte">
        <span className="ligne-lecon-titre">{titre}</span>
        {duree !== undefined || criteres ? (
          <span className="ligne-lecon-meta">
            {duree !== undefined ? formaterDuree(duree) : null}
            {duree !== undefined && criteres ? " · " : null}
            {criteres ? (
              <span className="ligne-lecon-criteres">
                {criteres.faits}/{criteres.total}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
    </LienInterne>
  );
}

/** État d'une leçon : rond plein coché si faite, anneau vide sinon. */
export function LeconEtat({ faite }: { faite: boolean }) {
  return (
    <span className={faite ? "lecon-etat faite" : "lecon-etat"} aria-hidden="true">
      {faite ? <Icone nom="check" taille={10} /> : null}
    </span>
  );
}

/**
 * Module repliable d'un sommaire (rail et fiche). Le clic sur l'en-tête est
 * intercepté : l'état React — mémorisé par `useModulesReplies` — reste la
 * seule source de vérité de `open`, sinon le navigateur et la mémoire
 * divergeraient.
 */
export function ModuleRepliable({
  ouvert,
  surBascule,
  className = "module",
  enTete,
  children,
}: {
  ouvert: boolean;
  surBascule: () => void;
  className?: string;
  /** Contenu du `summary` (titre, durée, compteur). */
  enTete: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className={className} open={ouvert}>
      <summary
        className="module-entete"
        onClick={(evenement) => {
          evenement.preventDefault();
          surBascule();
        }}
      >
        {enTete}
        <span className="module-chevron" aria-hidden="true">
          <Icone nom="caret-down" taille={14} />
        </span>
      </summary>
      {children}
    </details>
  );
}

export function BlocErreur({
  titre,
  message,
  action,
}: {
  titre: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="erreur-bloc" role="alert">
      <strong style={{ color: "var(--text)", fontWeight: 500 }}>{titre}</strong>
      {message ? <span>{message}</span> : null}
      {action}
    </div>
  );
}
