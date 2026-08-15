import type Database from "better-sqlite3";

/**
 * État des critères de réussite, par compte (CR-R7). Table NOUVELLE, à côté de
 * `progression` qui n'est ni recréée ni modifiée (CR-R7b) : la progression aux
 * leçons reste l'unité d'avancement (CR-R13), les critères en sont le détail.
 *
 * L'absence de ligne signifie « jamais touché » — l'état du markdown s'applique
 * alors. Une ligne enregistre donc aussi bien un cochage qu'un décochage.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS criteres (
  utilisateur_id INTEGER NOT NULL,
  formation_id   TEXT NOT NULL,
  lecon_id       TEXT NOT NULL,
  critere_id     TEXT NOT NULL,
  coche          INTEGER NOT NULL,
  bascule_le     TEXT NOT NULL,
  PRIMARY KEY (utilisateur_id, formation_id, lecon_id, critere_id)
);
CREATE INDEX IF NOT EXISTS idx_criteres_lecon
  ON criteres (utilisateur_id, formation_id, lecon_id);
`;

export class BaseCriteres {
  constructor(private readonly db: Database.Database) {
    db.exec(SCHEMA);
  }

  /** Coche ou décoche — idempotent, seule la date de bascule change (CR-R5). */
  basculer(
    utilisateurId: number,
    formationId: string,
    leconId: string,
    critereId: string,
    coche: boolean,
    date = new Date(),
  ): void {
    this.db
      .prepare(
        `INSERT INTO criteres
           (utilisateur_id, formation_id, lecon_id, critere_id, coche, bascule_le)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (utilisateur_id, formation_id, lecon_id, critere_id)
         DO UPDATE SET coche = excluded.coche, bascule_le = excluded.bascule_le`,
      )
      .run(
        utilisateurId,
        formationId,
        leconId,
        critereId,
        coche ? 1 : 0,
        date.toISOString(),
      );
  }

  /** États enregistrés d'une leçon — une seule requête avant le rendu. */
  etatsDe(
    utilisateurId: number,
    formationId: string,
    leconId: string,
  ): Map<string, boolean> {
    const lignes = this.db
      .prepare<[number, string, string], { critere_id: string; coche: number }>(
        `SELECT critere_id, coche FROM criteres
         WHERE utilisateur_id = ? AND formation_id = ? AND lecon_id = ?`,
      )
      .all(utilisateurId, formationId, leconId);
    return new Map(lignes.map((ligne) => [ligne.critere_id, ligne.coche === 1]));
  }

  /** Date de la dernière bascule — ce dont la révision espacée aura besoin. */
  basculeLe(
    utilisateurId: number,
    formationId: string,
    leconId: string,
    critereId: string,
  ): string | null {
    const ligne = this.db
      .prepare<[number, string, string, string], { bascule_le: string }>(
        `SELECT bascule_le FROM criteres
         WHERE utilisateur_id = ? AND formation_id = ? AND lecon_id = ? AND critere_id = ?`,
      )
      .get(utilisateurId, formationId, leconId, critereId);
    return ligne?.bascule_le ?? null;
  }

  /**
   * Retire les critères qui ne sont plus dans la leçon (CR-R3) : un critère
   * reformulé change d'identité, sa coche devient orpheline. Silencieux.
   */
  purgerOrphelins(
    utilisateurId: number,
    formationId: string,
    leconId: string,
    idsConnus: ReadonlySet<string>,
  ): number {
    const presents = [...this.etatsDe(utilisateurId, formationId, leconId).keys()];
    const orphelins = presents.filter((id) => !idsConnus.has(id));
    if (orphelins.length === 0) return 0;
    const suppression = this.db.prepare(
      `DELETE FROM criteres
       WHERE utilisateur_id = ? AND formation_id = ? AND lecon_id = ? AND critere_id = ?`,
    );
    const transaction = this.db.transaction((ids: string[]) => {
      for (const id of ids) suppression.run(utilisateurId, formationId, leconId, id);
    });
    transaction(orphelins);
    return orphelins.length;
  }

  /** Réinitialiser une formation efface aussi ses critères (CR-R8). */
  reinitialiser(utilisateurId: number, formationId: string): number {
    return this.db
      .prepare("DELETE FROM criteres WHERE utilisateur_id = ? AND formation_id = ?")
      .run(utilisateurId, formationId).changes;
  }

  /** Supprimer un compte efface aussi ses critères (CR-R8, CO-R8). */
  effacerCompte(utilisateurId: number): number {
    return this.db
      .prepare("DELETE FROM criteres WHERE utilisateur_id = ?")
      .run(utilisateurId).changes;
  }
}
