import type { ReactNode } from "react";

/**
 * Barrière devant les écrans qui modifient une formation (ED-R2, ED-R10).
 *
 * Deux refus, deux messages : un lecteur n'a rien à y faire, un administrateur
 * a simplement laissé l'édition éteinte. Dans les deux cas l'écran demandé
 * n'est pas monté du tout — pas de formulaire vide, pas de requête partie.
 */
export function GardeEcriture({
  estAdmin,
  edition,
  surAllumer,
  surRetour,
  children,
}: {
  estAdmin: boolean;
  edition: boolean;
  surAllumer: () => void;
  surRetour: () => void;
  children: ReactNode;
}) {
  if (!estAdmin) {
    return (
      <Refus
        titre="Réservé aux administrateurs"
        message="Cet écran modifie les formations. Votre compte peut les lire, pas les écrire."
      >
        <button type="button" className="bouton bouton-petit" onClick={surRetour}>
          Retour au catalogue
        </button>
      </Refus>
    );
  }

  if (!edition) {
    return (
      <Refus
        titre="L'édition est désactivée"
        message="Cet écran modifie vos formations. Activez l'édition pour continuer."
      >
        <button type="button" className="bouton bouton-petit" onClick={surAllumer}>
          Activer l'édition et continuer
        </button>
        <button
          type="button"
          className="bouton bouton-petit bouton-neutre"
          onClick={surRetour}
        >
          Retour
        </button>
      </Refus>
    );
  }

  return <>{children}</>;
}

function Refus({
  titre,
  message,
  children,
}: {
  titre: string;
  message: string;
  children: ReactNode;
}) {
  return (
    <div className="page">
      <div className="titre-page">
        <h1>{titre}</h1>
      </div>
      <p className="meta-faible" style={{ maxWidth: "46ch" }}>
        {message}
      </p>
      <div className="actions-formulaire">{children}</div>
    </div>
  );
}
