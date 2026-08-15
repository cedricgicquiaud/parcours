import type Database from "better-sqlite3";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS reglages (
  cle    TEXT PRIMARY KEY,
  valeur TEXT NOT NULL
);
`;

export interface Reglages {
  /** L'inscription libre est-elle ouverte ? Fermée par défaut (EM-R6). */
  inscriptionOuverte: boolean;
  /** Base des liens envoyés par e-mail (EM-R12). */
  urlPublique: string;
  /** Adresse d'expédition des e-mails. */
  expediteur: string;
}

export const REGLAGES_PAR_DEFAUT: Reglages = {
  inscriptionOuverte: false,
  urlPublique: "http://127.0.0.1:4620",
  expediteur: "Parcours <parcours@localhost>",
};

const LONGUEUR_MAX = 500;

/** Réglages de l'instance, en base pour survivre à un redémarrage (EM-R12). */
export class BaseReglages {
  constructor(private readonly db: Database.Database) {
    db.exec(SCHEMA);
  }

  lire(): Reglages {
    const lignes = this.db
      .prepare<[], { cle: string; valeur: string }>("SELECT cle, valeur FROM reglages")
      .all();
    const stockes = new Map(lignes.map((ligne) => [ligne.cle, ligne.valeur]));
    return {
      inscriptionOuverte:
        stockes.get("inscriptionOuverte") === "1" ||
        (stockes.has("inscriptionOuverte")
          ? false
          : REGLAGES_PAR_DEFAUT.inscriptionOuverte),
      urlPublique: stockes.get("urlPublique") ?? REGLAGES_PAR_DEFAUT.urlPublique,
      expediteur: stockes.get("expediteur") ?? REGLAGES_PAR_DEFAUT.expediteur,
    };
  }

  /**
   * Applique les réglages fournis, en ignorant les clés absentes. Rend une
   * erreur lisible plutôt que d'écrire une valeur inutilisable.
   */
  ecrire(
    changements: Partial<Reglages>,
  ): { ok: true; valeur: Reglages } | { ok: false; erreur: string } {
    const aEcrire: Array<[string, string]> = [];

    if (changements.inscriptionOuverte !== undefined) {
      if (typeof changements.inscriptionOuverte !== "boolean") {
        return { ok: false, erreur: "inscriptionOuverte : booléen attendu" };
      }
      aEcrire.push(["inscriptionOuverte", changements.inscriptionOuverte ? "1" : "0"]);
    }

    if (changements.urlPublique !== undefined) {
      const url = verifierUrl(changements.urlPublique);
      if (!url.ok) return url;
      aEcrire.push(["urlPublique", url.valeur]);
    }

    if (changements.expediteur !== undefined) {
      if (
        typeof changements.expediteur !== "string" ||
        changements.expediteur.trim().length === 0 ||
        changements.expediteur.length > LONGUEUR_MAX
      ) {
        return { ok: false, erreur: "expediteur : texte non vide attendu" };
      }
      aEcrire.push(["expediteur", changements.expediteur.trim()]);
    }

    const enregistrer = this.db.prepare(
      "INSERT INTO reglages (cle, valeur) VALUES (?, ?) ON CONFLICT (cle) DO UPDATE SET valeur = excluded.valeur",
    );
    this.db.transaction((entrees: Array<[string, string]>) => {
      for (const [cle, valeur] of entrees) enregistrer.run(cle, valeur);
    })(aEcrire);

    return { ok: true, valeur: this.lire() };
  }
}

/** L'URL publique sert à fabriquer des liens : elle doit être http(s) et sans query. */
function verifierUrl(
  valeur: unknown,
): { ok: true; valeur: string } | { ok: false; erreur: string } {
  if (typeof valeur !== "string" || valeur.length > LONGUEUR_MAX) {
    return { ok: false, erreur: "urlPublique : adresse attendue" };
  }
  let url: URL;
  try {
    url = new URL(valeur.trim());
  } catch {
    return { ok: false, erreur: `urlPublique invalide : ${valeur.slice(0, 80)}` };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, erreur: "urlPublique : http ou https attendu" };
  }
  // Normalisée sans barre finale : les liens sont construits par concaténation.
  return { ok: true, valeur: `${url.origin}${url.pathname}`.replace(/\/+$/, "") };
}
