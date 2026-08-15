import type { Transporter } from "nodemailer";

export interface Message {
  destinataire: string;
  sujet: string;
  texte: string;
}

export interface Expediteur {
  /** Nom du mode, pour le diagnostic : « journal » ou « smtp ». */
  readonly mode: "journal" | "smtp";
  envoyer(message: Message, expediteur: string): Promise<void>;
}

/**
 * Mode par défaut (EM-R10) : Parcours n'ouvre AUCUNE connexion sortante. Le
 * message part dans le journal du serveur, lien compris — de quoi dérouler
 * toute la recette sans compte d'envoi.
 */
export class ExpediteurJournal implements Expediteur {
  readonly mode = "journal";
  /** Derniers messages, exposés pour les tests et le diagnostic local. */
  readonly envoyes: Message[] = [];

  constructor(private readonly ecrire: (ligne: string) => void = console.log) {}

  async envoyer(message: Message): Promise<void> {
    this.envoyes.push(message);
    this.ecrire(
      [
        "",
        "──────── Courriel non envoyé (aucun SMTP configuré) ────────",
        `À      : ${message.destinataire}`,
        `Sujet  : ${message.sujet}`,
        "",
        message.texte,
        "────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
  }
}

/** Envoi réel, activé seulement si `PARCOURS_SMTP_URL` est configurée. */
export class ExpediteurSmtp implements Expediteur {
  readonly mode = "smtp";

  constructor(private readonly transport: Transporter) {}

  static async creer(url: string): Promise<ExpediteurSmtp> {
    // Import dynamique : sans SMTP configuré, nodemailer n'est jamais chargé.
    const { createTransport } = await import("nodemailer");
    return new ExpediteurSmtp(createTransport(url));
  }

  async envoyer(message: Message, expediteur: string): Promise<void> {
    await this.transport.sendMail({
      from: expediteur,
      to: message.destinataire,
      subject: message.sujet,
      text: message.texte,
    });
  }
}

/**
 * Choisit le mode d'envoi selon la configuration. Sans `PARCOURS_SMTP_URL`,
 * le mode journal : c'est le défaut, et il ne sort pas de la machine (A-R6).
 */
export async function creerExpediteur(
  env: NodeJS.ProcessEnv = process.env,
): Promise<Expediteur> {
  const url = env.PARCOURS_SMTP_URL?.trim();
  if (!url) return new ExpediteurJournal();
  try {
    return await ExpediteurSmtp.creer(url);
  } catch (erreur) {
    console.warn(
      `SMTP inutilisable (${(erreur as Error).message}) — retour au mode journal.`,
    );
    return new ExpediteurJournal();
  }
}

/**
 * Envoie sans jamais faire échouer l'appelant (EM-R11) : un serveur SMTP
 * injoignable ne doit annuler ni une inscription ni une demande de
 * réinitialisation. L'adresse n'apparaît pas dans le journal d'erreur.
 */
export async function envoyerSansBloquer(
  expediteur: Expediteur,
  message: Message,
  de: string,
): Promise<boolean> {
  try {
    await expediteur.envoyer(message, de);
    return true;
  } catch (erreur) {
    console.warn(`Envoi de courriel impossible : ${(erreur as Error).message}`);
    return false;
  }
}
