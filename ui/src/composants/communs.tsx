import type { ReactNode } from "react";

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

/** Pied de page présent sur tous les écrans (U-R8). */
export function PiedPlateforme() {
  return (
    <footer className="pied-plateforme">
      Projet indépendant, non affilié à Anthropic.
    </footer>
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
