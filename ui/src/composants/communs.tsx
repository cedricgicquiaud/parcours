import type { ReactNode } from "react";
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
