import { useCallback, useState } from "react";
import { api, ErreurApi, type ReponseImport } from "./api";
import { construireDepot, nomDuDepot, type EntreeDepot } from "./depot";

/**
 * Gestes d'administration du cycle de vie d'une formation (P010) : importer,
 * archiver, mettre à la corbeille, restaurer. Chaque geste rend un message
 * lisible, et rien n'est destructeur — « supprimer » déplace en corbeille.
 */
export function useAdministration(surChangement: () => void) {
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  /** Rend `true` si l'action a bien été menée — `false` si annulée ou en échec. */
  const executer = useCallback(
    async (action: () => Promise<string | null>): Promise<boolean> => {
      setOccupe(true);
      setErreur(null);
      setMessage(null);
      try {
        const compte = await action();
        if (compte === null) return false;
        setMessage(compte);
        surChangement();
        return true;
      } catch (cause: unknown) {
        setErreur(cause instanceof Error ? cause.message : "action impossible");
        return false;
      } finally {
        setOccupe(false);
      }
    },
    [surChangement],
  );

  /**
   * Import d'un dossier déposé. Un `formation.json` refusé n'est jamais ignoré
   * en silence (G-R5) : Parcours demande s'il doit déduire le sommaire.
   */
  const importer = useCallback(
    async (entrees: EntreeDepot[]) => {
      const nom = nomDuDepot(entrees);
      if (!nom) {
        setMessage(null);
        setErreur(
          "Déposez le dossier de la formation lui-même, pas des fichiers isolés.",
        );
        return false;
      }

      return executer(async () => {
        const fichiers = await construireDepot(entrees);
        try {
          return resume(await api.importer(nom, fichiers));
        } catch (cause: unknown) {
          if (!(cause instanceof ErreurApi) || !cause.peutGenerer) throw cause;
          const accepte = window.confirm(
            `Le formation.json de ce dossier est refusé : ${cause.message}\n\n` +
              "Importer quand même, avec un sommaire construit à partir des fichiers markdown ?",
          );
          if (!accepte) throw cause;
          return resume(await api.importer(nom, fichiers, true));
        }
      });
    },
    [executer],
  );

  const archiver = useCallback(
    (fid: string, titre: string) =>
      executer(async () => {
        await api.archiver(fid);
        return `« ${titre} » est archivée. Elle reste restaurable en un clic.`;
      }),
    [executer],
  );

  const restaurerArchive = useCallback(
    (fid: string, titre: string) =>
      executer(async () => {
        await api.restaurerArchive(fid);
        return `« ${titre} » est de retour au catalogue.`;
      }),
    [executer],
  );

  /** Mise à la corbeille : confirmée, et jamais définitive (G-R9, G-R11). */
  const supprimer = useCallback(
    (fid: string, titre: string, depuisArchives = false) =>
      executer(async () => {
        const accepte = window.confirm(
          `Mettre « ${titre} » à la corbeille ?\n\n` +
            "Le dossier est déplacé, pas supprimé : vous pourrez le restaurer, " +
            "et vider la corbeille vous-même depuis le Finder.",
        );
        if (!accepte) return null;
        await (depuisArchives
          ? api.mettreArchiveEnCorbeille(fid)
          : api.mettreEnCorbeille(fid));
        return `« ${titre} » est dans la corbeille.`;
      }),
    [executer],
  );

  const restaurerCorbeille = useCallback(
    (entree: string, titre: string) =>
      executer(async () => {
        const { id } = await api.restaurerDeCorbeille(entree);
        return `« ${titre || id} » est de retour au catalogue.`;
      }),
    [executer],
  );

  const effacer = useCallback(() => {
    setMessage(null);
    setErreur(null);
  }, []);

  return {
    occupe,
    message,
    erreur,
    effacer,
    importer,
    archiver,
    restaurerArchive,
    supprimer,
    restaurerCorbeille,
  };
}

export type Administration = ReturnType<typeof useAdministration>;

function resume(resultat: ReponseImport): string {
  const lecons = `${resultat.lecons} leçon${resultat.lecons > 1 ? "s" : ""}`;
  const sommaire = resultat.manifesteGenere
    ? " Sommaire construit automatiquement : vérifiez-le dans « Modifier la structure »."
    : "";
  const ignores =
    resultat.ignores.length > 0
      ? ` ${resultat.ignores.length} fichier${resultat.ignores.length > 1 ? "s" : ""} système ignoré${resultat.ignores.length > 1 ? "s" : ""}.`
      : "";
  return `« ${resultat.titre} » importée — ${lecons}.${sommaire}${ignores}`;
}
