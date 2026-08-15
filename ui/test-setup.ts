import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Les tests importent explicitement `describe`/`it` (pas de `globals`) :
// le nettoyage du DOM entre deux rendus doit donc être branché à la main.
afterEach(cleanup);

// jsdom n'implémente pas scrollTo, appelé à chaque navigation du routeur.
window.scrollTo = () => undefined;
