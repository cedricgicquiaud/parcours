import { useCallback, useEffect, useState } from "react";

export type Route =
  | { nom: "catalogue" }
  | { nom: "formation"; fid: string }
  | { nom: "lecon"; fid: string; lid: string }
  | { nom: "administration" }
  | { nom: "structure"; fid: string }
  | { nom: "editer"; fid: string; lid: string }
  | { nom: "inconnue"; chemin: string };

/** Trois routes seulement (§ 5) : pas de dépendance de routage. */
export function analyserChemin(chemin: string): Route {
  const segments = chemin.split("/").filter((segment) => segment.length > 0);
  if (segments.length === 0) return { nom: "catalogue" };
  if (segments[0] === "administration" && segments.length === 1) {
    return { nom: "administration" };
  }
  if (segments[0] === "formation" && segments[1]) {
    const fid = decodeURIComponent(segments[1]);
    if (segments.length === 2) return { nom: "formation", fid };
    if (segments[2] === "structure" && segments.length === 3) {
      return { nom: "structure", fid };
    }
    if (segments[2] === "lecon" && segments[3]) {
      const lid = decodeURIComponent(segments[3]);
      if (segments.length === 4) return { nom: "lecon", fid, lid };
      if (segments[4] === "editer" && segments.length === 5) {
        return { nom: "editer", fid, lid };
      }
    }
  }
  return { nom: "inconnue", chemin };
}

export function cheminDe(route: Route): string {
  switch (route.nom) {
    case "catalogue":
      return "/";
    case "formation":
      return `/formation/${encodeURIComponent(route.fid)}`;
    case "lecon":
      return `/formation/${encodeURIComponent(route.fid)}/lecon/${encodeURIComponent(route.lid)}`;
    case "administration":
      return "/administration";
    case "structure":
      return `/formation/${encodeURIComponent(route.fid)}/structure`;
    case "editer":
      return `/formation/${encodeURIComponent(route.fid)}/lecon/${encodeURIComponent(route.lid)}/editer`;
    default:
      return route.chemin;
  }
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(() =>
    analyserChemin(window.location.pathname),
  );

  useEffect(() => {
    const surRetour = () => setRoute(analyserChemin(window.location.pathname));
    window.addEventListener("popstate", surRetour);
    return () => window.removeEventListener("popstate", surRetour);
  }, []);

  const naviguer = useCallback((cible: Route) => {
    const chemin = cheminDe(cible);
    if (chemin !== window.location.pathname) {
      window.history.pushState(null, "", chemin);
    }
    setRoute(cible);
    window.scrollTo({ top: 0 });
  }, []);

  return { route, naviguer };
}

/**
 * Intercepte les clics sur les liens internes produits par le rendu serveur
 * (liens `lecon:`, F-R12) pour rester en navigation côté client.
 */
export function estClicSimple(evenement: React.MouseEvent): boolean {
  return (
    evenement.button === 0 &&
    !evenement.metaKey &&
    !evenement.ctrlKey &&
    !evenement.shiftKey &&
    !evenement.altKey
  );
}
