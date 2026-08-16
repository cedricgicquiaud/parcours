import { useState, type FormEvent } from "react";
import { api, ErreurApi, type Compte } from "../api";
import { Icone, PiedPlateforme } from "../composants/communs";

type Vue = "connexion" | "inscription" | "oubli";

/**
 * Écran d'accueil de l'authentification (P011, P012). Trois vues sur le même
 * formulaire : se connecter, s'inscrire (si le réglage l'autorise), demander un
 * lien de réinitialisation. Sert aussi à l'installation du premier compte.
 */
export function Connexion({
  installation,
  inscriptionOuverte,
  surConnexion,
}: {
  installation: boolean;
  inscriptionOuverte: boolean;
  surConnexion: (compte: Compte) => void;
}) {
  const [vue, setVue] = useState<Vue>("connexion");
  const [identifiant, setIdentifiant] = useState("");
  const [nom, setNom] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [aRenvoyer, setARenvoyer] = useState(false);
  const [occupe, setOccupe] = useState(false);

  const changerVue = (cible: Vue) => {
    setVue(cible);
    setErreur(null);
    setMessage(null);
    setARenvoyer(false);
  };

  const avecMotDePasse = installation || vue !== "oubli";
  const doubleSaisie = installation || vue === "inscription";

  const envoyer = async (evenement: FormEvent) => {
    evenement.preventDefault();
    setErreur(null);
    setMessage(null);
    setARenvoyer(false);

    if (doubleSaisie && motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setOccupe(true);
    try {
      if (installation) {
        const reponse = await api.installer({
          identifiant,
          nom: nom || identifiant,
          motDePasse,
        });
        surConnexion(reponse.compte);
      } else if (vue === "inscription") {
        setMessage((await api.inscription(identifiant, motDePasse)).message);
      } else if (vue === "oubli") {
        setMessage((await api.motDePasseOublie(identifiant)).message);
      } else {
        surConnexion((await api.connexion(identifiant, motDePasse)).compte);
      }
    } catch (cause: unknown) {
      setErreur(cause instanceof Error ? cause.message : "connexion impossible");
      // EM-R4 : adresse non confirmée — on propose de renvoyer le lien.
      if (cause instanceof ErreurApi && cause.statut === 403) setARenvoyer(true);
    } finally {
      setOccupe(false);
    }
  };

  const renvoyer = async () => {
    setOccupe(true);
    setErreur(null);
    try {
      setMessage((await api.renvoyerConfirmation(identifiant)).message);
      setARenvoyer(false);
    } catch (cause: unknown) {
      setErreur(cause instanceof Error ? cause.message : "envoi impossible");
    } finally {
      setOccupe(false);
    }
  };

  const titre = installation
    ? "Créer le compte administrateur"
    : vue === "inscription"
      ? "Créer un compte"
      : vue === "oubli"
        ? "Mot de passe oublié"
        : "Se connecter";

  return (
    <div className="ecran-auth">
      <form className="carte-auth" onSubmit={(evenement) => void envoyer(evenement)}>
        <div className="marque-auth">
          <Icone nom="graduation-cap" taille={22} />
          <span>Parcours</span>
        </div>

        <h1>{titre}</h1>
        <p className="aide-auth">
          {installation
            ? "Premier démarrage : ce compte administrera Parcours, ses formations et les autres comptes."
            : vue === "inscription"
              ? "Vous recevrez un lien pour confirmer votre adresse avant d'entrer."
              : vue === "oubli"
                ? "Indiquez votre adresse : un lien de réinitialisation vous y sera envoyé."
                : "Vos formations et votre progression vous attendent."}
        </p>

        <label className="champ">
          <span>Adresse e-mail</span>
          <input
            name="identifiant"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoFocus
            required
            value={identifiant}
            onChange={(evenement) => setIdentifiant(evenement.target.value)}
          />
        </label>

        {installation ? (
          <label className="champ">
            <span>Nom affiché (optionnel)</span>
            <input
              name="nom"
              autoComplete="name"
              value={nom}
              onChange={(evenement) => setNom(evenement.target.value)}
            />
          </label>
        ) : null}

        {avecMotDePasse ? (
          <label className="champ">
            <span>Mot de passe</span>
            <input
              name="motDePasse"
              type="password"
              autoComplete={doubleSaisie ? "new-password" : "current-password"}
              required
              value={motDePasse}
              onChange={(evenement) => setMotDePasse(evenement.target.value)}
            />
          </label>
        ) : null}

        {doubleSaisie ? (
          <>
            <label className="champ">
              <span>Confirmer le mot de passe</span>
              <input
                name="confirmation"
                type="password"
                autoComplete="new-password"
                required
                value={confirmation}
                onChange={(evenement) => setConfirmation(evenement.target.value)}
              />
            </label>
            <p className="aide-auth">
              10 caractères au minimum.
              {installation
                ? " Il n'y a pas de récupération par e-mail tant qu'aucun envoi n'est configuré."
                : ""}
            </p>
          </>
        ) : null}

        {erreur ? (
          <div className="erreur-auth" role="alert">
            {erreur}
            {aRenvoyer ? (
              <button
                type="button"
                className="lien-auth"
                disabled={occupe}
                onClick={() => void renvoyer()}
              >
                Renvoyer le lien de confirmation
              </button>
            ) : null}
          </div>
        ) : null}

        {message ? (
          <div className="message-auth" role="status">
            {message}
          </div>
        ) : null}

        <button type="submit" className="bouton" disabled={occupe}>
          {occupe
            ? "…"
            : installation
              ? "Créer le compte et entrer"
              : vue === "inscription"
                ? "Créer mon compte"
                : vue === "oubli"
                  ? "Envoyer le lien"
                  : "Se connecter"}
          <Icone nom="arrow-right" />
        </button>

        {installation ? null : (
          <div className="liens-auth">
            {vue === "connexion" ? (
              <>
                <button
                  type="button"
                  className="lien-auth"
                  onClick={() => changerVue("oubli")}
                >
                  Mot de passe oublié
                </button>
                {inscriptionOuverte ? (
                  <button
                    type="button"
                    className="lien-auth"
                    onClick={() => changerVue("inscription")}
                  >
                    Créer un compte
                  </button>
                ) : null}
              </>
            ) : (
              <button
                type="button"
                className="lien-auth"
                onClick={() => changerVue("connexion")}
              >
                Revenir à la connexion
              </button>
            )}
          </div>
        )}
      </form>
      <PiedPlateforme />
    </div>
  );
}
