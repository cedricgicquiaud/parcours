import { useState, type FormEvent } from "react";
import { api, type Compte } from "../api";
import { Bandeau, BlocErreur, Icone } from "../composants/communs";
import type { Route } from "../routeur";

/** Profil personnel : nom affiché et mot de passe (CO-R4, CO-R5). */
export function Profil({
  compte,
  surCompteChange,
  naviguer,
}: {
  compte: Compte;
  surCompteChange: (compte: Compte) => void;
  naviguer: (route: Route) => void;
}) {
  const [nom, setNom] = useState(compte.nom);
  const [actuel, setActuel] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const executer = async (action: () => Promise<string>) => {
    setOccupe(true);
    setErreur(null);
    setMessage(null);
    try {
      setMessage(await action());
    } catch (cause: unknown) {
      setErreur(cause instanceof Error ? cause.message : "action impossible");
    } finally {
      setOccupe(false);
    }
  };

  const renommer = (evenement: FormEvent) => {
    evenement.preventDefault();
    void executer(async () => {
      const reponse = await api.renommerProfil(nom);
      surCompteChange(reponse.compte);
      setNom(reponse.compte.nom);
      return "Nom mis à jour.";
    });
  };

  const changerMotDePasse = (evenement: FormEvent) => {
    evenement.preventDefault();
    if (nouveau !== confirmation) {
      setMessage(null);
      setErreur("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }
    void executer(async () => {
      const reponse = await api.changerMonMotDePasse(actuel, nouveau);
      setActuel("");
      setNouveau("");
      setConfirmation("");
      const autres = reponse.sessionsRevoquees;
      return autres > 0
        ? `Mot de passe changé. ${autres} autre${autres > 1 ? "s" : ""} session${autres > 1 ? "s ont" : " a"} été fermée${autres > 1 ? "s" : ""}.`
        : "Mot de passe changé.";
    });
  };

  return (
    <div className="page">
      <div className="titre-page">
        <h1>Mon profil</h1>
        <span className="meta-faible">
          {compte.role === "admin" ? "Administrateur" : "Lecteur"}
        </span>
      </div>

      {message ? <Bandeau icone="check-circle">{message}</Bandeau> : null}
      {erreur ? <BlocErreur titre="Action impossible" message={erreur} /> : null}

      <form className="carte formulaire-profil" onSubmit={renommer}>
        <span className="kicker-faible">IDENTITÉ</span>
        <label className="champ">
          <span>Identifiant de connexion</span>
          <input value={compte.identifiant} readOnly className="identifiant-fige" />
        </label>
        <p className="aide-champ">
          L'identifiant ne se change pas ici : demandez-le à un administrateur.
        </p>
        <label className="champ">
          <span>Nom affiché</span>
          <input
            value={nom}
            required
            onChange={(evenement) => setNom(evenement.target.value)}
          />
        </label>
        <div className="actions-formulaire">
          <button
            type="submit"
            className="bouton bouton-petit"
            disabled={occupe || nom.trim() === compte.nom}
          >
            Enregistrer
          </button>
        </div>
      </form>

      <form className="carte formulaire-profil" onSubmit={changerMotDePasse}>
        <span className="kicker-faible">MOT DE PASSE</span>
        <label className="champ">
          <span>Mot de passe actuel</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={actuel}
            onChange={(evenement) => setActuel(evenement.target.value)}
          />
        </label>
        <label className="champ">
          <span>Nouveau mot de passe</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={nouveau}
            onChange={(evenement) => setNouveau(evenement.target.value)}
          />
        </label>
        <label className="champ">
          <span>Confirmer le nouveau mot de passe</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirmation}
            onChange={(evenement) => setConfirmation(evenement.target.value)}
          />
        </label>
        <p className="aide-champ">
          Changer de mot de passe ferme vos autres sessions ouvertes. Celle-ci reste
          active.
        </p>
        <div className="actions-formulaire">
          <button type="submit" className="bouton bouton-petit" disabled={occupe}>
            Changer le mot de passe
          </button>
        </div>
      </form>

      {compte.role === "admin" ? (
        <button
          type="button"
          className="bouton bouton-petit bouton-neutre"
          style={{ alignSelf: "flex-start" }}
          onClick={() => naviguer({ nom: "comptes" })}
        >
          <Icone nom="users-three" taille={14} />
          Gérer les comptes
        </button>
      ) : null}

    </div>
  );
}
