import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, type Compte, type Role } from "../api";
import {
  Bandeau,
  BlocErreur,
  Icone,
  PiedPlateforme,
  Squelette,
} from "../composants/communs";

/** Console d'administration des comptes (CO-R6 à CO-R10). */
export function ConsoleComptes({ moi }: { moi: Compte }) {
  const [comptes, setComptes] = useState<Compte[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [motDePasseProvisoire, setMotDePasseProvisoire] = useState<{
    identifiant: string;
    valeur: string;
  } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const charger = useCallback(async () => {
    try {
      setComptes((await api.utilisateurs()).utilisateurs);
    } catch (cause: unknown) {
      setErreur(cause instanceof Error ? cause.message : "chargement impossible");
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const executer = useCallback(
    async (action: () => Promise<string | null>) => {
      setOccupe(true);
      setErreur(null);
      setMessage(null);
      try {
        const compte = await action();
        if (compte !== null) {
          setMessage(compte);
          await charger();
        }
      } catch (cause: unknown) {
        setErreur(cause instanceof Error ? cause.message : "action impossible");
      } finally {
        setOccupe(false);
      }
    },
    [charger],
  );

  const modifier = (compte: Compte, changements: Parameters<typeof api.modifierUtilisateur>[1]) =>
    void executer(async () => {
      await api.modifierUtilisateur(compte.id, changements);
      return `« ${compte.nom} » mis à jour.`;
    });

  const reinitialiser = (compte: Compte) =>
    void executer(async () => {
      const accepte = window.confirm(
        `Réinitialiser le mot de passe de « ${compte.nom} » ?\n\n` +
          "Un mot de passe provisoire s'affichera une seule fois, et les sessions " +
          "ouvertes de cette personne seront fermées.",
      );
      if (!accepte) return null;
      const reponse = await api.reinitialiserMotDePasse(compte.id);
      setMotDePasseProvisoire({
        identifiant: compte.identifiant,
        valeur: reponse.motDePasseProvisoire,
      });
      return null;
    });

  const supprimer = (compte: Compte) =>
    void executer(async () => {
      const accepte = window.confirm(
        `Supprimer définitivement le compte « ${compte.nom} » ?\n\n` +
          "Sa progression sera effacée. C'est la seule action de Parcours qui " +
          "détruit vraiment des données.",
      );
      if (!accepte) return null;
      const reponse = await api.supprimerUtilisateur(compte.id);
      return `Compte supprimé (${reponse.progressionEffacee} coche${reponse.progressionEffacee > 1 ? "s" : ""} effacée${reponse.progressionEffacee > 1 ? "s" : ""}).`;
    });

  return (
    <div className="page">
      <div className="titre-page">
        <h1>Comptes</h1>
        <span className="meta-faible">
          {comptes ? `${comptes.length} compte${comptes.length > 1 ? "s" : ""}` : "…"}
        </span>
      </div>

      {message ? <Bandeau icone="check-circle">{message}</Bandeau> : null}
      {erreur ? <BlocErreur titre="Action impossible" message={erreur} /> : null}

      {motDePasseProvisoire ? (
        <Bandeau
          icone="key"
          actions={
            <button
              type="button"
              className="bouton bouton-petit bouton-neutre"
              onClick={() => {
                setMotDePasseProvisoire(null);
                void charger();
              }}
            >
              J'ai noté
            </button>
          }
        >
          Mot de passe provisoire de <strong>{motDePasseProvisoire.identifiant}</strong> :{" "}
          <code className="mot-de-passe-provisoire">{motDePasseProvisoire.valeur}</code> —
          il ne sera plus affiché.
        </Bandeau>
      ) : null}

      <FormulaireCreation
        occupe={occupe}
        surCreer={(saisie) =>
          void executer(async () => {
            const reponse = await api.creerUtilisateur(saisie);
            return `Compte « ${reponse.compte.identifiant} » créé.`;
          })
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <span className="kicker-faible">TOUS LES COMPTES</span>
        {comptes === null ? (
          <div className="carte" style={{ gap: 12 }}>
            <Squelette largeur="45%" hauteur={16} />
            <Squelette largeur="70%" />
          </div>
        ) : (
          comptes.map((compte) => (
            <LigneCompte
              key={compte.id}
              compte={compte}
              moi={moi}
              occupe={occupe}
              surModifier={modifier}
              surReinitialiser={reinitialiser}
              surSupprimer={supprimer}
            />
          ))
        )}
      </div>

      <PiedPlateforme />
    </div>
  );
}

function LigneCompte({
  compte,
  moi,
  occupe,
  surModifier,
  surReinitialiser,
  surSupprimer,
}: {
  compte: Compte;
  moi: Compte;
  occupe: boolean;
  surModifier: (compte: Compte, changements: { role?: Role; actif?: boolean }) => void;
  surReinitialiser: (compte: Compte) => void;
  surSupprimer: (compte: Compte) => void;
}) {
  const soiMeme = compte.id === moi.id;

  return (
    <div className={`ligne-compte${compte.actif ? "" : " ligne-compte-inactive"}`}>
      <div className="ligne-cycle-texte">
        <span className="ligne-cycle-titre">
          {compte.nom}
          {soiMeme ? <span className="etiquette-moi">vous</span> : null}
          {compte.actif ? null : <span className="etiquette-inactif">désactivé</span>}
        </span>
        <span className="meta-faible">
          <code>{compte.identifiant}</code> ·{" "}
          {compte.derniereConnexion
            ? `dernière connexion le ${new Date(compte.derniereConnexion).toLocaleDateString("fr-FR")}`
            : "jamais connecté"}
        </span>
      </div>

      <label className="champ-inline">
        <span className="sr-seulement">Rôle de {compte.nom}</span>
        <select
          value={compte.role}
          disabled={occupe || soiMeme}
          aria-label={`Rôle de ${compte.nom}`}
          onChange={(evenement) =>
            surModifier(compte, { role: evenement.target.value as Role })
          }
        >
          <option value="admin">Administrateur</option>
          <option value="lecteur">Lecteur</option>
        </select>
      </label>

      <button
        type="button"
        className="bouton bouton-petit bouton-neutre"
        disabled={occupe}
        onClick={() => surReinitialiser(compte)}
      >
        <Icone nom="key" taille={14} />
        Mot de passe
      </button>

      <button
        type="button"
        className="bouton bouton-petit bouton-neutre"
        disabled={occupe || soiMeme}
        onClick={() => surModifier(compte, { actif: !compte.actif })}
      >
        {compte.actif ? "Désactiver" : "Réactiver"}
      </button>

      <button
        type="button"
        className="bouton bouton-petit bouton-neutre"
        disabled={occupe || soiMeme || compte.actif}
        title={
          compte.actif ? "Désactivez le compte avant de le supprimer" : undefined
        }
        onClick={() => surSupprimer(compte)}
      >
        <Icone nom="trash" taille={14} />
      </button>
    </div>
  );
}

function FormulaireCreation({
  occupe,
  surCreer,
}: {
  occupe: boolean;
  surCreer: (saisie: {
    identifiant: string;
    nom: string;
    motDePasse: string;
    role: Role;
  }) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [identifiant, setIdentifiant] = useState("");
  const [nom, setNom] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [role, setRole] = useState<Role>("lecteur");

  if (!ouvert) {
    return (
      <button
        type="button"
        className="bouton bouton-petit"
        style={{ alignSelf: "flex-start" }}
        onClick={() => setOuvert(true)}
      >
        <Icone nom="plus" taille={14} />
        Nouveau compte
      </button>
    );
  }

  const envoyer = (evenement: FormEvent) => {
    evenement.preventDefault();
    surCreer({ identifiant, nom: nom || identifiant, motDePasse, role });
    setIdentifiant("");
    setNom("");
    setMotDePasse("");
    setOuvert(false);
  };

  return (
    <form className="carte formulaire-profil" onSubmit={envoyer}>
      <span className="kicker-faible">NOUVEAU COMPTE</span>
      <label className="champ">
        <span>Identifiant</span>
        <input
          required
          autoFocus
          value={identifiant}
          onChange={(evenement) => setIdentifiant(evenement.target.value)}
        />
      </label>
      <label className="champ">
        <span>Nom affiché (optionnel)</span>
        <input value={nom} onChange={(evenement) => setNom(evenement.target.value)} />
      </label>
      <label className="champ">
        <span>Mot de passe provisoire</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={motDePasse}
          onChange={(evenement) => setMotDePasse(evenement.target.value)}
        />
      </label>
      <label className="champ">
        <span>Rôle</span>
        <select
          value={role}
          onChange={(evenement) => setRole(evenement.target.value as Role)}
        >
          <option value="lecteur">Lecteur — lit et progresse</option>
          <option value="admin">Administrateur — gère formations et comptes</option>
        </select>
      </label>
      <div className="actions-formulaire">
        <button type="submit" className="bouton bouton-petit" disabled={occupe}>
          Créer le compte
        </button>
        <button
          type="button"
          className="bouton bouton-petit bouton-neutre"
          onClick={() => setOuvert(false)}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
