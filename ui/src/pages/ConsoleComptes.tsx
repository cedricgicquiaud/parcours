import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, type Compte, type Reglages, type ReponseReglages, type Role } from "../api";
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
  const [reglages, setReglages] = useState<ReponseReglages | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [motDePasseProvisoire, setMotDePasseProvisoire] = useState<{
    identifiant: string;
    valeur: string;
  } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const charger = useCallback(async () => {
    try {
      const [liste, configuration] = await Promise.all([
        api.utilisateurs(),
        api.reglages(),
      ]);
      setComptes(liste.utilisateurs);
      setReglages(configuration);
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

  const confirmerAdresse = (compte: Compte) =>
    void executer(async () => {
      await api.confirmerUtilisateur(compte.id);
      return `Adresse de « ${compte.nom} » marquée comme confirmée.`;
    });

  const renvoyerLien = (compte: Compte) =>
    void executer(async () => {
      await api.renvoyerConfirmationA(compte.id);
      return `Lien de confirmation renvoyé à ${compte.identifiant}.`;
    });

  const enregistrerReglages = (changements: Partial<Reglages>) =>
    void executer(async () => {
      setReglages(await api.enregistrerReglages(changements));
      return "Réglages enregistrés.";
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

      {reglages ? (
        <BlocReglages
          etat={reglages}
          occupe={occupe}
          surEnregistrer={enregistrerReglages}
        />
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
              surConfirmer={confirmerAdresse}
              surRenvoyerLien={renvoyerLien}
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
  surConfirmer,
  surRenvoyerLien,
}: {
  compte: Compte;
  moi: Compte;
  occupe: boolean;
  surModifier: (compte: Compte, changements: { role?: Role; actif?: boolean }) => void;
  surReinitialiser: (compte: Compte) => void;
  surSupprimer: (compte: Compte) => void;
  surConfirmer: (compte: Compte) => void;
  surRenvoyerLien: (compte: Compte) => void;
}) {
  const soiMeme = compte.id === moi.id;

  return (
    <div className={`ligne-compte${compte.actif ? "" : " ligne-compte-inactive"}`}>
      <div className="ligne-cycle-texte">
        <span className="ligne-cycle-titre">
          {compte.nom}
          {soiMeme ? <span className="etiquette-moi">vous</span> : null}
          {compte.actif ? null : <span className="etiquette-inactif">désactivé</span>}
          {compte.emailVerifie ? null : (
            <span className="etiquette-inactif">adresse non confirmée</span>
          )}
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

      {compte.emailVerifie ? null : (
        <>
          <button
            type="button"
            className="bouton bouton-petit bouton-neutre"
            disabled={occupe}
            title="Renvoyer le courriel de confirmation"
            onClick={() => surRenvoyerLien(compte)}
          >
            <Icone nom="envelope-simple" taille={14} />
            Renvoyer
          </button>
          <button
            type="button"
            className="bouton bouton-petit bouton-neutre"
            disabled={occupe}
            title="Marquer l'adresse comme confirmée, sans courriel"
            onClick={() => surConfirmer(compte)}
          >
            Confirmer
          </button>
        </>
      )}

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

/** Réglages de l'instance : inscription, adresse publique, expéditeur (EM-R12). */
function BlocReglages({
  etat,
  occupe,
  surEnregistrer,
}: {
  etat: ReponseReglages;
  occupe: boolean;
  surEnregistrer: (changements: Partial<Reglages>) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [urlPublique, setUrlPublique] = useState(etat.reglages.urlPublique);
  const [expediteur, setExpediteur] = useState(etat.reglages.expediteur);

  return (
    <section className="carte formulaire-profil">
      <div className="ligne-reglage">
        <div className="ligne-cycle-texte">
          <span className="ligne-cycle-titre">Inscription libre</span>
          <span className="meta-faible">
            {etat.reglages.inscriptionOuverte
              ? "N'importe qui peut créer un compte et recevra un lien de confirmation."
              : "Seul un administrateur crée les comptes."}
          </span>
        </div>
        <button
          type="button"
          className="bouton bouton-petit bouton-neutre"
          disabled={occupe}
          onClick={() =>
            surEnregistrer({ inscriptionOuverte: !etat.reglages.inscriptionOuverte })
          }
        >
          {etat.reglages.inscriptionOuverte ? "Fermer" : "Ouvrir"}
        </button>
      </div>

      <div className="ligne-reglage">
        <div className="ligne-cycle-texte">
          <span className="ligne-cycle-titre">Envoi des courriels</span>
          <span className="meta-faible">
            {etat.envoiCourriel === "smtp"
              ? "SMTP configuré : les liens partent vraiment."
              : "Aucun SMTP : les liens s'affichent dans le journal du serveur."}
          </span>
        </div>
        <button
          type="button"
          className="bouton bouton-petit bouton-neutre"
          onClick={() => setOuvert((valeur) => !valeur)}
          aria-expanded={ouvert}
        >
          {ouvert ? "Masquer" : "Régler"}
        </button>
      </div>

      {ouvert ? (
        <>
          <label className="champ">
            <span>Adresse publique de Parcours</span>
            <input
              value={urlPublique}
              onChange={(evenement) => setUrlPublique(evenement.target.value)}
            />
          </label>
          <p className="aide-champ">
            Base des liens envoyés par courriel. Doit être joignable par la
            personne qui reçoit le message.
          </p>
          <label className="champ">
            <span>Expéditeur</span>
            <input
              value={expediteur}
              onChange={(evenement) => setExpediteur(evenement.target.value)}
            />
          </label>
          <p className="aide-champ">
            Le serveur d'envoi se configure hors de l'application, par la variable
            d'environnement <code>PARCOURS_SMTP_URL</code>.
          </p>
          <div className="actions-formulaire">
            <button
              type="button"
              className="bouton bouton-petit"
              disabled={occupe}
              onClick={() => surEnregistrer({ urlPublique, expediteur })}
            >
              Enregistrer
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
