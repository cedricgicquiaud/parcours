import { useState, type FormEvent } from "react";
import { api, type Compte } from "../api";
import { Icone, PiedPlateforme } from "../composants/communs";

/**
 * Écran d'accueil de l'authentification (P011). Sert aussi à l'installation :
 * tant qu'aucun compte n'existe, il crée le premier — forcément administrateur
 * (AU-R1). Le formulaire est le même, les libellés changent.
 */
export function Connexion({
  installation,
  surConnexion,
}: {
  installation: boolean;
  surConnexion: (compte: Compte) => void;
}) {
  const [identifiant, setIdentifiant] = useState("");
  const [nom, setNom] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const envoyer = async (evenement: FormEvent) => {
    evenement.preventDefault();
    setErreur(null);

    if (installation && motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setOccupe(true);
    try {
      const reponse = installation
        ? await api.installer({ identifiant, nom: nom || identifiant, motDePasse })
        : await api.connexion(identifiant, motDePasse);
      surConnexion(reponse.compte);
    } catch (cause: unknown) {
      setErreur(cause instanceof Error ? cause.message : "connexion impossible");
    } finally {
      setOccupe(false);
    }
  };

  return (
    <div className="ecran-auth">
      <form className="carte-auth" onSubmit={(evenement) => void envoyer(evenement)}>
        <div className="marque-auth">
          <Icone nom="graduation-cap" taille={22} />
          <span>Parcours</span>
        </div>

        <h1>{installation ? "Créer le compte administrateur" : "Se connecter"}</h1>
        <p className="aide-auth">
          {installation
            ? "Premier démarrage : ce compte administrera Parcours, ses formations et les autres comptes."
            : "Vos formations et votre progression vous attendent."}
        </p>

        <label className="champ">
          <span>Identifiant</span>
          <input
            name="identifiant"
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

        <label className="champ">
          <span>Mot de passe</span>
          <input
            name="motDePasse"
            type="password"
            autoComplete={installation ? "new-password" : "current-password"}
            required
            value={motDePasse}
            onChange={(evenement) => setMotDePasse(evenement.target.value)}
          />
        </label>

        {installation ? (
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
              10 caractères au minimum. Il n'y a pas de récupération par e-mail :
              Parcours ne sort pas de votre machine.
            </p>
          </>
        ) : null}

        {erreur ? (
          <div className="erreur-auth" role="alert">
            {erreur}
          </div>
        ) : null}

        <button type="submit" className="bouton" disabled={occupe}>
          {occupe
            ? "…"
            : installation
              ? "Créer le compte et entrer"
              : "Se connecter"}
          <Icone nom="arrow-right" />
        </button>
      </form>
      <PiedPlateforme />
    </div>
  );
}
