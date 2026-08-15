import { useEffect, useRef, useState } from "react";
import { api, type ReponseRechercheApi } from "./api";

/** Anti-rebond de la recherche, en millisecondes (U-R9). */
export const DELAI_ANTI_REBOND = 200;

/** Longueur minimale d'une requête envoyée au serveur (S-R4, U-R9). */
export const MINIMUM_CARACTERES = 2;

export interface EtatRecherche {
  requete: string;
  setRequete: (valeur: string) => void;
  effacer: () => void;
  active: boolean;
  chargement: boolean;
  reponse: ReponseRechercheApi | null;
  erreur: string | null;
}

/**
 * Recherche dans la formation ouverte (§ 3B, U-R9) : anti-rebond de 200 ms et
 * abandon des réponses plus anciennes que la requête courante — pas de
 * résultats clignotants.
 */
export function useRecherche(fid: string | null): EtatRecherche {
  const [requete, setRequete] = useState("");
  const [reponse, setReponse] = useState<ReponseRechercheApi | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const compteur = useRef(0);

  const active = requete.trim().length >= MINIMUM_CARACTERES;

  useEffect(() => {
    if (!fid || !active) {
      setReponse(null);
      setChargement(false);
      setErreur(null);
      return;
    }
    const rang = ++compteur.current;
    const controleur = new AbortController();
    setChargement(true);
    const minuteur = window.setTimeout(() => {
      api
        .rechercher(fid, requete.trim(), controleur.signal)
        .then((resultat) => {
          if (rang !== compteur.current) return; // réponse périmée
          setReponse(resultat);
          setErreur(null);
        })
        .catch((cause: unknown) => {
          if (controleur.signal.aborted || rang !== compteur.current) return;
          setErreur(cause instanceof Error ? cause.message : "recherche impossible");
        })
        .finally(() => {
          if (rang === compteur.current) setChargement(false);
        });
    }, DELAI_ANTI_REBOND);

    return () => {
      window.clearTimeout(minuteur);
      controleur.abort();
    };
  }, [fid, requete, active]);

  // La requête n'est pas mémorisée d'une formation à l'autre (§ 6.5).
  useEffect(() => {
    setRequete("");
  }, [fid]);

  return {
    requete,
    setRequete,
    effacer: () => setRequete(""),
    active,
    chargement,
    reponse,
    erreur,
  };
}

/** Découpe un extrait selon les positions renvoyées par l'API (S-R6). */
export function morceauxSurlignes(
  extrait: string,
  occurrences: Array<{ debut: number; longueur: number }>,
): Array<{ texte: string; surligne: boolean }> {
  const morceaux: Array<{ texte: string; surligne: boolean }> = [];
  let position = 0;
  for (const occurrence of occurrences) {
    if (occurrence.debut > position) {
      morceaux.push({ texte: extrait.slice(position, occurrence.debut), surligne: false });
    }
    const fin = occurrence.debut + occurrence.longueur;
    morceaux.push({ texte: extrait.slice(occurrence.debut, fin), surligne: true });
    position = fin;
  }
  if (position < extrait.length) {
    morceaux.push({ texte: extrait.slice(position), surligne: false });
  }
  return morceaux;
}
