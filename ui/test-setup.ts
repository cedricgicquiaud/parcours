import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Les tests importent explicitement `describe`/`it` (pas de `globals`) :
// le nettoyage du DOM entre deux rendus doit donc être branché à la main.
afterEach(cleanup);

// jsdom n'implémente pas scrollTo, appelé à chaque navigation du routeur.
window.scrollTo = () => undefined;

// Sous Node 26, `window.localStorage` n'existe pas dans l'environnement de test
// (le localStorage natif est désactivé et masque celui de jsdom). Le navigateur
// en a un, lui : on en pose un équivalent, adossé à une Map, pour que les
// préférences (thème, rail, édition) soient testables.
if (!window.localStorage) {
  const boite = new Map<string, string>();
  const stockage = {
    getItem: (cle: string) => boite.get(cle) ?? null,
    setItem: (cle: string, valeur: string) => void boite.set(cle, String(valeur)),
    removeItem: (cle: string) => void boite.delete(cle),
    clear: () => boite.clear(),
    key: (index: number) => [...boite.keys()][index] ?? null,
    get length() {
      return boite.size;
    },
  };
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: stockage,
  });
}
