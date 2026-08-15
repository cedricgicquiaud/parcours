/** Longueur maximale d'un extrait de résultat (S-R5). */
export const LONGUEUR_EXTRAIT = 160;

/** Nombre maximal de résultats renvoyés (S-R5). */
export const MAX_RESULTATS = 50;

export interface Occurrence {
  debut: number;
  longueur: number;
}

export interface TexteNormalise {
  normalise: string;
  /** Position dans le texte d'origine de chaque caractère normalisé. */
  carte: number[];
}

/**
 * Normalisation S-R4 : NFC, suppression des diacritiques, minuscules — en
 * gardant la trace des positions d'origine pour pouvoir surligner le texte brut.
 */
export function normaliser(texte: string): TexteNormalise {
  let normalise = "";
  const carte: number[] = [];
  const source = texte.normalize("NFC");
  for (let i = 0; i < source.length; i++) {
    const caractere = source[i]!;
    const remplace = caractere
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    for (const lettre of remplace) {
      normalise += lettre;
      carte.push(i);
    }
  }
  return { normalise, carte };
}

/** Mots de la requête (S-R4) : tous doivent être présents (ET). */
export function motsDeRequete(requete: string): string[] {
  return normaliser(requete)
    .normalise.split(/[^\p{L}\p{N}_-]+/u)
    .filter((mot) => mot.length > 0);
}

/** Longueur utile de la requête après nettoyage (S-R4 : minimum 2). */
export function longueurUtile(requete: string): number {
  return motsDeRequete(requete).join("").length;
}

function occurrencesDe(normalise: string, mot: string): number[] {
  const positions: number[] = [];
  let depuis = 0;
  for (;;) {
    const trouve = normalise.indexOf(mot, depuis);
    if (trouve === -1) return positions;
    positions.push(trouve);
    depuis = trouve + mot.length;
  }
}

export interface Correspondance {
  extrait: string;
  occurrences: Occurrence[];
}

/**
 * Cherche tous les mots dans un texte (ET, S-R4) et construit l'extrait de
 * 160 caractères centré sur la première occurrence (S-R5). L'extrait est du
 * TEXTE BRUT : le surlignage se fait côté UI à partir des positions (S-R6).
 */
export function chercherDansTexte(
  texte: string,
  mots: string[],
): Correspondance | null {
  if (mots.length === 0) return null;
  const { normalise, carte } = normaliser(texte);

  const parMot = mots.map((mot) => occurrencesDe(normalise, mot));
  if (parMot.some((positions) => positions.length === 0)) return null;

  const premiere = Math.min(...parMot.map((positions) => positions[0]!));
  const centre = carte[premiere] ?? 0;

  const { debut, fin, tronqueAvant, tronqueApres } = fenetreDExtrait(texte, centre);
  const brut = texte.slice(debut, fin).replace(/\s+/g, " ").trim();
  const prefixe = tronqueAvant ? "…" : "";
  const suffixe = tronqueApres ? "…" : "";
  const extrait = `${prefixe}${brut}${suffixe}`;

  // Les positions sont recalculées dans l'extrait final, pour l'UI.
  const occurrences: Occurrence[] = [];
  const extraitNormalise = normaliser(extrait);
  for (const mot of mots) {
    for (const position of occurrencesDe(extraitNormalise.normalise, mot)) {
      const debutBrut = extraitNormalise.carte[position];
      const finBrut = extraitNormalise.carte[position + mot.length - 1];
      if (debutBrut === undefined || finBrut === undefined) continue;
      occurrences.push({ debut: debutBrut, longueur: finBrut - debutBrut + 1 });
    }
  }
  occurrences.sort((a, b) => a.debut - b.debut);

  return { extrait, occurrences: fusionner(occurrences) };
}

function fenetreDExtrait(texte: string, centre: number) {
  if (texte.length <= LONGUEUR_EXTRAIT) {
    return { debut: 0, fin: texte.length, tronqueAvant: false, tronqueApres: false };
  }
  let debut = Math.max(0, centre - Math.floor(LONGUEUR_EXTRAIT / 2));
  let fin = Math.min(texte.length, debut + LONGUEUR_EXTRAIT);
  debut = Math.max(0, fin - LONGUEUR_EXTRAIT);

  // Coupe aux frontières de mots (S-R5).
  if (debut > 0) {
    const espace = texte.indexOf(" ", debut);
    if (espace !== -1 && espace < centre) debut = espace + 1;
  }
  if (fin < texte.length) {
    const espace = texte.lastIndexOf(" ", fin);
    if (espace > centre) fin = espace;
  }
  return {
    debut,
    fin,
    tronqueAvant: debut > 0,
    tronqueApres: fin < texte.length,
  };
}

function fusionner(occurrences: Occurrence[]): Occurrence[] {
  const fusionnees: Occurrence[] = [];
  for (const occurrence of occurrences) {
    const derniere = fusionnees.at(-1);
    if (derniere && occurrence.debut <= derniere.debut + derniere.longueur) {
      const fin = Math.max(
        derniere.debut + derniere.longueur,
        occurrence.debut + occurrence.longueur,
      );
      derniere.longueur = fin - derniere.debut;
    } else {
      fusionnees.push({ ...occurrence });
    }
  }
  return fusionnees;
}
