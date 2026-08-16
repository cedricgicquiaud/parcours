import fs from "node:fs/promises";
import path from "node:path";
import { horodater } from "./cycle";
import { fusionnerAvecExistant } from "./ecriture";
import type { Manifeste, Validation } from "./manifeste";

/** 2 Mo : au-delà, une couverture ralentit le catalogue pour rien (FI-R14). */
export const MAX_OCTETS_COUVERTURE = 2_000_000;

/**
 * Signatures des formats acceptés. On ne se fie pas à l'extension : un PDF
 * renommé en `.png` doit être refusé (FI-R14).
 */
const SIGNATURES: Array<{
  extensions: string[];
  signature: number[];
  decalage?: number;
}> = [
  { extensions: [".png"], signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { extensions: [".jpg", ".jpeg"], signature: [0xff, 0xd8, 0xff] },
  { extensions: [".gif"], signature: [0x47, 0x49, 0x46, 0x38] },
  // WebP : « RIFF » puis « WEBP » à l'octet 8.
  { extensions: [".webp"], signature: [0x57, 0x45, 0x42, 0x50], decalage: 8 },
];

export interface CouvertureDeposee {
  /** Nom d'origine, dont seule l'extension est retenue. */
  nom: string;
  /** Contenu encodé en base64, comme à l'import d'un dossier (P010). */
  contenu: string;
}

export interface ErreurCouverture {
  erreur: string;
  /** 400 par défaut ; 413 quand le fichier est trop lourd. */
  statut: 400 | 413;
}

function echec(erreur: string, statut: 400 | 413 = 400): { ok: false } & ErreurCouverture {
  return { ok: false, erreur, statut };
}

/** Vérifie le nom, le poids et le contenu réel. */
export function verifierCouverture(
  depot: unknown,
): ({ ok: true; extension: string; octets: Buffer }) | ({ ok: false } & ErreurCouverture) {
  if (typeof depot !== "object" || depot === null) return echec("objet JSON attendu");
  const { nom, contenu } = depot as Partial<CouvertureDeposee>;
  if (typeof nom !== "string" || nom.trim().length === 0) {
    return echec("nom : nom de fichier attendu");
  }
  if (typeof contenu !== "string" || contenu.length === 0) {
    return echec("contenu : image encodée en base64 attendue");
  }

  const extension = path.extname(nom).toLowerCase();
  const format = SIGNATURES.find((candidat) => candidat.extensions.includes(extension));
  if (!format) {
    const acceptees = SIGNATURES.flatMap((candidat) => candidat.extensions).join(", ");
    return echec(`nom : image attendue (${acceptees})`);
  }

  let octets: Buffer;
  try {
    octets = Buffer.from(contenu, "base64");
  } catch {
    return echec("contenu : base64 illisible");
  }
  if (octets.byteLength === 0) return echec("contenu : fichier vide");
  if (octets.byteLength > MAX_OCTETS_COUVERTURE) {
    return echec(
      `contenu : ${Math.round(MAX_OCTETS_COUVERTURE / 1_000_000)} Mo au plus`,
      413,
    );
  }

  const debut = format.decalage ?? 0;
  const attendu = Buffer.from(format.signature);
  if (!octets.subarray(debut, debut + attendu.length).equals(attendu)) {
    return echec(`contenu : ce fichier n'est pas un ${extension.slice(1).toUpperCase()}`);
  }
  return { ok: true, extension, octets };
}

/**
 * Écrit la couverture et met le manifeste à jour. **N'écrase jamais** : le
 * fichier est daté, l'ancienne couverture reste sur le disque (FI-R15, P010).
 * Les autres champs du manifeste sont préservés (FI-R9).
 */
export async function enregistrerCouverture(
  dossier: string,
  manifeste: Manifeste,
  extension: string,
  octets: Buffer,
  maintenant = new Date(),
): Promise<Validation<{ couverture: string }>> {
  const assets = path.join(dossier, "assets");
  await fs.mkdir(assets, { recursive: true });

  const base = `couverture-${horodater(maintenant)}`;
  let nom = `${base}${extension}`;
  let suffixe = 2;
  // Deux dépôts dans la même seconde ne doivent pas se recouvrir.
  while (await existe(path.join(assets, nom))) {
    nom = `${base}-${suffixe}${extension}`;
    suffixe += 1;
  }

  const complet = path.join(assets, nom);
  const temporaire = `${complet}.${process.pid}.tmp`;
  await fs.writeFile(temporaire, octets);
  await fs.rename(temporaire, complet);

  const couverture = `assets/${nom}`;
  const ancien = await lireManifeste(dossier);
  const fusionne = fusionnerAvecExistant({ ...manifeste, couverture }, ancien);
  fusionne.couverture = couverture;
  const cible = path.join(dossier, "formation.json");
  const tampon = path.join(dossier, `.formation.json.${process.pid}.tmp`);
  await fs.writeFile(tampon, `${JSON.stringify(fusionne, null, 2)}\n`, "utf8");
  await fs.rename(tampon, cible);

  return { ok: true, valeur: { couverture } };
}

async function existe(chemin: string): Promise<boolean> {
  try {
    await fs.stat(chemin);
    return true;
  } catch {
    return false;
  }
}

async function lireManifeste(dossier: string): Promise<unknown> {
  try {
    return JSON.parse(
      await fs.readFile(path.join(dossier, "formation.json"), "utf8"),
    ) as unknown;
  } catch {
    return null;
  }
}
