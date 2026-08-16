import { useCallback, useEffect, useState } from "react";

export type Mode = "clair" | "sombre";

const CLE_MODE = "parcours.mode";
const CLE_RAIL = "parcours.railReplie";

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
