import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type Mode = "clair" | "sombre";

const CLE_MODE = "parcours.mode";
const CLE_RAIL = "parcours.railReplie";
/** Préférence d'affichage, jamais une autorisation (ED-R6). */
export const CLE_EDITION = "parcours.edition";

function lire(cle: string): string | null {
  try {
    return window.localStorage.getItem(cle);
  } catch {
    return null;
  }
}

function ecrire(cle: string, valeur: string): void {
  try {
    window.localStorage.setItem(cle, valeur);
  } catch {
    // Stockage indisponible (navigation privée) : la préférence reste en mémoire.
  }
}

/**
 * Mode clair/sombre. La classe de palette est posée sur la racine ET sur
 * `body` — sinon l'overscroll laisse voir l'autre fond (handoff, § Interactions).
 */
export function useMode() {
  const [mode, setMode] = useState<Mode>(() =>
    lire(CLE_MODE) === "sombre" ? "sombre" : "clair",
  );

  useEffect(() => {
    const classe = `p-${mode}`;
    document.documentElement.className = classe;
    document.body.className = classe;
    ecrire(CLE_MODE, mode);
  }, [mode]);

  const basculer = useCallback(() => {
    setMode((courant) => (courant === "sombre" ? "clair" : "sombre"));
  }, []);

  return { mode, basculer };
}

/** État replié de la colonne latérale, mémorisé entre les sessions. */
export function useRailReplie() {
  const [replie, setReplie] = useState<boolean>(() => lire(CLE_RAIL) === "oui");

  const basculer = useCallback(() => {
    setReplie((courant) => {
      ecrire(CLE_RAIL, courant ? "non" : "oui");
      return !courant;
    });
  }, []);

  return { replie, basculer, setReplie };
}

/** Préfixe des clés de pli du sommaire — exporté pour les tests. */
export const CLE_MODULES_REPLIES = "parcours.modulesReplies.";

function lireModulesReplies(formationId: string): ReadonlySet<string> {
  try {
    const liste: unknown = JSON.parse(lire(CLE_MODULES_REPLIES + formationId) ?? "[]");
    return new Set(
      Array.isArray(liste) ? liste.filter((id) => typeof id === "string") : [],
    );
  } catch {
    return new Set();
  }
}

// Store partagé : le rail et la fiche montrent le même sommaire en même temps,
// un pli fait d'un côté doit se voir de l'autre sans remontage. La mémoire vit
// ici tant qu'au moins une vue est abonnée ; la dernière partie, on relira le
// stockage à la prochaine visite.
const repliesParFormation = new Map<string, ReadonlySet<string>>();
const abonnesParFormation = new Map<string, Set<() => void>>();

function repliesDe(formationId: string): ReadonlySet<string> {
  let replies = repliesParFormation.get(formationId);
  if (!replies) {
    replies = lireModulesReplies(formationId);
    repliesParFormation.set(formationId, replies);
  }
  return replies;
}

function replierModule(formationId: string, moduleId: string, valeur: boolean): void {
  const courant = repliesDe(formationId);
  if (courant.has(moduleId) === valeur) return;
  const suivant = new Set(courant);
  if (valeur) suivant.add(moduleId);
  else suivant.delete(moduleId);
  repliesParFormation.set(formationId, suivant);
  ecrire(CLE_MODULES_REPLIES + formationId, JSON.stringify([...suivant]));
  abonnesParFormation.get(formationId)?.forEach((prevenir) => prevenir());
}

/**
 * Modules repliés du sommaire, mémorisés par formation entre les sessions et
 * partagés entre toutes les vues montées. Un id qui ne correspond plus à
 * aucun module est simplement ignoré au rendu.
 */
export function useModulesReplies(formationId: string) {
  const abonner = useCallback(
    (prevenir: () => void) => {
      let abonnes = abonnesParFormation.get(formationId);
      if (!abonnes) {
        abonnes = new Set();
        abonnesParFormation.set(formationId, abonnes);
      }
      abonnes.add(prevenir);
      return () => {
        abonnes.delete(prevenir);
        if (abonnes.size === 0) {
          abonnesParFormation.delete(formationId);
          repliesParFormation.delete(formationId);
        }
      };
    },
    [formationId],
  );
  const replies = useSyncExternalStore(abonner, () => repliesDe(formationId));

  const replier = useCallback(
    (moduleId: string, valeur: boolean) => replierModule(formationId, moduleId, valeur),
    [formationId],
  );
  const basculer = useCallback(
    (moduleId: string) =>
      replierModule(formationId, moduleId, !repliesDe(formationId).has(moduleId)),
    [formationId],
  );

  return { estReplie: (moduleId: string) => replies.has(moduleId), replier, basculer };
}

/**
 * Mode édition (ED-R4). Éteint par défaut : Parcours est d'abord un lecteur.
 * C'est une préférence d'affichage — l'autorisation d'écrire reste celle du
 * serveur (CO-R2), et cet état ne lui est jamais envoyé (ED-R6).
 */
export function useEdition() {
  const [edition, setEdition] = useState<boolean>(() => lire(CLE_EDITION) === "oui");

  const appliquer = useCallback((valeur: boolean) => {
    ecrire(CLE_EDITION, valeur ? "oui" : "non");
    setEdition(valeur);
  }, []);

  const basculer = useCallback(() => {
    setEdition((courant) => {
      ecrire(CLE_EDITION, courant ? "non" : "oui");
      return !courant;
    });
  }, []);

  const eteindre = useCallback(() => appliquer(false), [appliquer]);
  const allumer = useCallback(() => appliquer(true), [appliquer]);

  return { edition, basculer, allumer, eteindre };
}

/**
 * Refetch à chaque navigation et au focus de la fenêtre (P-R7) : deux onglets
 * convergent sans action manuelle.
 */
export function useRafraichirAuFocus(rafraichir: () => void): void {
  useEffect(() => {
    const surFocus = () => {
      if (document.visibilityState === "visible") rafraichir();
    };
    window.addEventListener("focus", surFocus);
    document.addEventListener("visibilitychange", surFocus);
    return () => {
      window.removeEventListener("focus", surFocus);
      document.removeEventListener("visibilitychange", surFocus);
    };
  }, [rafraichir]);
}
