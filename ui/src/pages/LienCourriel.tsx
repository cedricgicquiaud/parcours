import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ErreurApi, type Compte } from "../api";
import { Icone, PiedPlateforme } from "../composants/communs";

/**
 * Écran atteint depuis un lien reçu par courriel (P012) : confirmation
 * d'adresse ou choix d'un nouveau mot de passe, selon la route.
 */
export function LienCourriel({
  action,
  jeton,
  surConnexion,
  surRetour,
}: {
  action: "confirmer" | "reinitialiser";
  jeton: string | null;
  surConnexion: (compte: Compte) => void;
  surRetour: () => void;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [jetonCourant, setJetonCourant] = useState(jeton);
  const dejaTente = useRef(false);

  // La confirmation se joue toute seule à l'ouverture du lien : la personne a
  // déjà agi en cliquant, lui redemander de valider n'apporterait rien.
  useEffect(() => {
    if (action !== "confirmer" || dejaTente.current) return;
    dejaTente.current = true;

    if (!jetonCourant) {
      setErreur("Ce lien est incomplet : ouvrez-le tel qu'il figure dans le courriel.");
      return;
    }
    setOccupe(true);
    api
      .confirmer(jetonCourant)
      .then((reponse) => surConnexion(reponse.compte))
      .catch((cause: unknown) =>
        setErreur(cause instanceof Error ? cause.message : "lien invalide"),
      )
      .finally(() => setOccupe(false));
  }, [action, jetonCourant, surConnexion]);

  const reinitialiser = async (evenement: FormEvent) => {
    evenement.preventDefault();
    setErreur(null);
    if (motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (!jetonCourant) {
      setErreur("Ce lien est incomplet : ouvrez-le tel qu'il figure dans le courriel.");
      return;
    }

    setOccupe(true);
    try {
      surConnexion((await api.reinitialiserAvecJeton(jetonCourant, motDePasse)).compte);
    } catch (cause: unknown) {
      setErreur(cause instanceof Error ? cause.message : "réinitialisation impossible");
      // Le serveur réémet un jeton quand seul le mot de passe est en cause.
      const remplacement = cause instanceof ErreurApi ? cause.corps.jeton : null;
      if (typeof remplacement === "string") setJetonCourant(remplacement);
    } finally {
      setOccupe(false);
    }
  };

  return (
    <div className="ecran-auth">
      <div className="carte-auth">
        <div className="marque-auth">
          <Icone nom="graduation-cap" taille={22} />
          <span>Parcours</span>
        </div>

        {action === "confirmer" ? (
          <>
            <h1>Confirmation de votre adresse</h1>
            <p className="aide-auth">
              {occupe ? "Vérification du lien…" : erreur ? "" : "Adresse confirmée."}
            </p>
          </>
        ) : (
          <form
            style={{ display: "contents" }}
            onSubmit={(evenement) => void reinitialiser(evenement)}
          >
            <h1>Choisir un nouveau mot de passe</h1>
            <p className="aide-auth">
              10 caractères au minimum. Toutes vos sessions ouvertes seront fermées.
            </p>
            <label className="champ">
              <span>Nouveau mot de passe</span>
              <input
                type="password"
                autoComplete="new-password"
                autoFocus
                required
                value={motDePasse}
                onChange={(evenement) => setMotDePasse(evenement.target.value)}
              />
            </label>
            <label className="champ">
              <span>Confirmer le mot de passe</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirmation}
                onChange={(evenement) => setConfirmation(evenement.target.value)}
              />
            </label>
            <button type="submit" className="bouton" disabled={occupe}>
              {occupe ? "…" : "Changer le mot de passe"}
              <Icone nom="arrow-right" />
            </button>
          </form>
        )}

        {erreur ? (
          <div className="erreur-auth" role="alert">
            {erreur}
          </div>
        ) : null}

        <div className="liens-auth">
          <button type="button" className="lien-auth" onClick={surRetour}>
            Revenir à la connexion
          </button>
        </div>
      </div>
      <PiedPlateforme />
    </div>
  );
}
