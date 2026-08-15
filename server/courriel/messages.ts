import type { Message } from "./envoi";

/** Construit un lien absolu depuis l'URL publique réglée (EM-R12). */
export function lien(urlPublique: string, chemin: string, jeton: string): string {
  return `${urlPublique}${chemin}?jeton=${encodeURIComponent(jeton)}`;
}

export function messageConfirmation(
  destinataire: string,
  urlPublique: string,
  jeton: string,
): Message {
  const adresse = lien(urlPublique, "/confirmer", jeton);
  return {
    destinataire,
    sujet: "Confirmez votre adresse — Parcours",
    texte: [
      "Bonjour,",
      "",
      "Pour activer votre compte Parcours, ouvrez ce lien :",
      adresse,
      "",
      "Le lien est valable 48 heures et ne fonctionne qu'une fois.",
      "",
      "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message :",
      "sans confirmation, le compte reste inutilisable.",
    ].join("\n"),
  };
}

export function messageReinitialisation(
  destinataire: string,
  urlPublique: string,
  jeton: string,
): Message {
  const adresse = lien(urlPublique, "/reinitialiser", jeton);
  return {
    destinataire,
    sujet: "Réinitialiser votre mot de passe — Parcours",
    texte: [
      "Bonjour,",
      "",
      "Vous avez demandé à changer votre mot de passe Parcours. Ouvrez ce lien :",
      adresse,
      "",
      "Le lien est valable 1 heure et ne fonctionne qu'une fois.",
      "Choisir un nouveau mot de passe fermera toutes vos sessions ouvertes.",
      "",
      "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message :",
      "votre mot de passe actuel reste valable.",
    ].join("\n"),
  };
}

/**
 * Envoyé quand quelqu'un tente de s'inscrire avec une adresse déjà utilisée
 * (EM-R7). L'inscription répond la même chose dans les deux cas : c'est ce
 * message qui prévient la personne concernée, elle seule.
 */
export function messageInscriptionExistante(
  destinataire: string,
  urlPublique: string,
): Message {
  return {
    destinataire,
    sujet: "Une inscription a été tentée avec votre adresse — Parcours",
    texte: [
      "Bonjour,",
      "",
      "Quelqu'un vient de tenter de créer un compte Parcours avec votre adresse.",
      "Vous en avez déjà un : connectez-vous plutôt ici :",
      `${urlPublique}/`,
      "",
      "Si vous avez oublié votre mot de passe, utilisez « Mot de passe oublié »",
      "sur l'écran de connexion.",
      "",
      "Aucun nouveau compte n'a été créé, et rien n'a changé sur le vôtre.",
    ].join("\n"),
  };
}
