import { useCallback, useEffect, useState } from "react";
import { api, type Compte } from "./api";

export type EtatSession =
  | { phase: "chargement" }
  | { phase: "installation" }
  | { phase: "anonyme" }
  | { phase: "connecte"; compte: Compte }
  | { phase: "injoignable"; erreur: string };

/**
 * État d'authentification de l'interface (P011). Interrogé au démarrage : tant
 * qu'aucun compte n'existe, l'application n'affiche que l'installation (AU-R1).
 */
export function useSession() {
  const [etat, setEtat] = useState<EtatSession>({ phase: "chargement" });

  const rafraichir = useCallback(async () => {
    try {
      const reponse = await api.etatAuth();
      if (reponse.installationRequise) return setEtat({ phase: "installation" });
      setEtat(
        reponse.compte
          ? { phase: "connecte", compte: reponse.compte }
          : { phase: "anonyme" },
      );
    } catch (cause: unknown) {
      setEtat({
        phase: "injoignable",
        erreur: cause instanceof Error ? cause.message : "Parcours ne répond pas",
      });
    }
  }, []);

  useEffect(() => {
    void rafraichir();
  }, [rafraichir]);

  const surConnexion = useCallback(
    (compte: Compte) => setEtat({ phase: "connecte", compte }),
    [],
  );

  const deconnecter = useCallback(async () => {
    await api.deconnexion().catch(() => undefined);
    setEtat({ phase: "anonyme" });
  }, []);

  return { etat, rafraichir, surConnexion, deconnecter, setEtat };
}

export type Session = ReturnType<typeof useSession>;
