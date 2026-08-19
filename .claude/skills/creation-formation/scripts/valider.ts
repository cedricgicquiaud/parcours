/**
 * Valide une formation avec le VRAI code de Parcours (scanner + moteur de
 * rendu) : statut, critères par leçon, durées, liens `lecon:` morts,
 * références `suppose` inconnues.
 *
 * Usage : npx tsx .claude/skills/creation-formation/scripts/valider.ts <dossier-formation>
 * Exemple : npx tsx .claude/skills/creation-formation/scripts/valider.ts formations/prise-en-main
 *
 * Sortie 0 si la formation est valide, 1 sinon.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { leconsOrdonnees } from "../../../../server/formations/manifeste";
import { scannerCatalogue, trouverFormation } from "../../../../server/formations/scan";
import { MoteurRendu, type CollecteCriteres } from "../../../../server/markdown/rendu";

const LIEN_LECON = /\]\(lecon:([^)\s]+)\)/g;

/**
 * Retire les blocs de code (```…```) et le code en ligne (`…`) : un lien
 * `lecon:` qui y figure est un exemple de syntaxe, pas un vrai lien.
 */
function sansCode(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

void (async () => {
  const cible = process.argv[2];
  if (!cible) {
    console.error("Usage : valider.ts <dossier-formation>");
    process.exit(2);
  }
  const dossier = path.resolve(cible);
  const parent = path.dirname(dossier);
  const id = path.basename(dossier);

  const scan = await scannerCatalogue(parent);
  const formation = trouverFormation(scan, id);
  if (!formation) {
    console.error(`✗ introuvable : aucune formation « ${id} » dans ${parent}`);
    process.exit(1);
  }
  if (formation.statut === "invalide") {
    console.error(`✗ INVALIDE — ${formation.erreur}`);
    process.exit(1);
  }

  const rendu = await MoteurRendu.creer();
  const entrees = leconsOrdonnees(formation.manifeste);
  const ids = new Set(entrees.map(({ lecon }) => lecon.id));
  const avertissements: string[] = [];
  let totalCriteres = 0;

  console.log(`✓ VALIDE — ${formation.manifeste.titre}`);
  console.log(
    `  ${formation.manifeste.modules.length} module(s), ${entrees.length} leçon(s)\n`,
  );

  for (const { module, lecon } of entrees) {
    const markdown = await fs.readFile(
      path.join(formation.dossier, lecon.fichier),
      "utf8",
    );
    const criteres: CollecteCriteres = { etats: new Map(), liste: [], tronquee: false };
    rendu.rendre(markdown, {
      formationId: formation.id,
      dossier: formation.dossier,
      idsLecons: ids,
      criteres,
    });
    totalCriteres += criteres.liste.length;

    const duree = lecon.duree !== undefined ? `${lecon.duree} min` : "durée absente";
    console.log(
      `  ${module.id}/${lecon.id} — ${criteres.liste.length} critère(s), ${duree}`,
    );

    if (criteres.liste.length === 0) {
      avertissements.push(`${lecon.id} : aucun critère — la leçon ne se vérifie pas`);
    } else if (criteres.liste.length > 6) {
      avertissements.push(
        `${lecon.id} : ${criteres.liste.length} critères — au-delà de 6, la liste devient une corvée`,
      );
    }
    if (lecon.duree === undefined) {
      avertissements.push(
        `${lecon.id} : pas de durée — le total de la formation ne s'affichera pas`,
      );
    }
    for (const correspondance of sansCode(markdown).matchAll(LIEN_LECON)) {
      if (!ids.has(correspondance[1]!)) {
        avertissements.push(
          `${lecon.id} : lien mort vers « lecon:${correspondance[1]} »`,
        );
      }
    }
    for (const suppose of lecon.suppose ?? []) {
      if (!ids.has(suppose)) {
        avertissements.push(
          `${lecon.id} : suppose « ${suppose} », qui n'existe pas (toléré au rendu, mais probablement une faute de frappe)`,
        );
      }
    }
  }

  console.log(`\n  ${totalCriteres} critères suivis au total`);
  if (avertissements.length > 0) {
    console.log(`\n⚠ ${avertissements.length} avertissement(s) :`);
    for (const avertissement of avertissements) console.log(`  - ${avertissement}`);
  } else {
    console.log("\nAucun avertissement.");
  }
})();
