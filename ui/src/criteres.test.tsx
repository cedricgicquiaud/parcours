import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { EtatCritere, ReponseCatalogue, ReponseFormation, ReponseLecon } from "./api";

const compte = {
  id: 1,
  identifiant: "cedric@exemple.fr",
  nom: "Cédric",
  role: "admin" as const,
  actif: true,
  emailVerifie: true,
  creeLe: "2026-08-15T09:00:00.000Z",
  derniereConnexion: null,
};

const CRITERES: EtatCritere[] = [
  { id: "aaaaaaaaaaaa-0", texte: "la commande affiche les 7 cours", coche: false },
  { id: "bbbbbbbbbbbb-0", texte: "le dépôt git est initialisé", coche: false },
];

const catalogue: ReponseCatalogue = {
  progressionReinitialisee: false,
  archivees: [],
  corbeille: [],
  formations: [
    {
      statut: "valide",
      id: "formation-claude",
      titre: "Formation pratique Claude",
      modules: 1,
      lecons: 1,
      faites: 0,
      pourcentage: 0,
      action: "commencer",
      prochaine: { id: "exercice", titre: "Exercice", moduleTitre: "Fondations" },
    },
  ],
};

const formation: ReponseFormation = {
  id: "formation-claude",
  titre: "Formation pratique Claude",
  avancement: {
    faites: 0,
    total: 1,
    pourcentage: 0,
    action: "commencer",
    prochaine: { id: "exercice", titre: "Exercice", moduleTitre: "Fondations" },
    orphelines: [],
    modules: [
      {
        id: "fondations",
        titre: "Fondations",
        faites: 0,
        total: 1,
        lecons: [{ id: "exercice", titre: "Exercice", faite: false }],
      },
    ],
  },
};

function leconAvec(criteres: EtatCritere[]): ReponseLecon {
  const cases = criteres
    .map(
      (critere) =>
        `<li><input type="checkbox" data-critere="${critere.id}"${
          critere.coche ? " checked" : ""
        }> ${critere.texte}</li>`,
    )
    .join("");
  return {
    formationId: "formation-claude",
    formationTitre: "Formation pratique Claude",
    leconId: "exercice",
    titre: "Exercice",
    moduleId: "fondations",
    moduleTitre: "Fondations",
    html: `<ul>${cases}</ul>`,
    faite: false,
    criteres,
    criteresTronques: false,
    position: 1,
    total: 1,
    precedente: null,
    suivante: null,
  };
}

function reponse(corps: unknown, statut = 200): Response {
  return { ok: statut < 400, status: statut, json: async () => corps } as Response;
}

let appels: string[];
let criteresCourants: EtatCritere[];
let bascule: (corps: unknown, statut?: number) => Response;

beforeEach(() => {
  appels = [];
  criteresCourants = CRITERES;
  bascule = () =>
    reponse({
      faite: false,
      avancement: formation.avancement,
      criteres: criteresCourants.map((critere, index) =>
        index === 0 ? { ...critere, coche: true } : critere,
      ),
    });
  window.history.pushState(null, "", "/formation/formation-claude/lecon/exercice");
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async (entree: RequestInfo | URL, init?: RequestInit) => {
      const url = String(entree);
      appels.push(`${init?.method ?? "GET"} ${url}`);
      if (url === "/api/auth/etat") {
        return reponse({ installationRequise: false, compte, inscriptionOuverte: false });
      }
      if (url === "/api/formations") return reponse(catalogue);
      if (url === "/api/formations/formation-claude") return reponse(formation);
      if (url.includes("/lecons/")) return reponse(leconAvec(criteresCourants));
      if (url.includes("/criteres/")) return bascule(null);
      return reponse({ erreur: `route non simulée : ${url}` }, 404);
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("décompte des critères dans la colonne latérale (CR-R9)", () => {
  it("affiche n/N sur la leçon courante et suit les coches", async () => {
    render(<App />);
    const sommaire = await screen.findByRole("navigation", {
      name: "Sommaire de la formation",
    });
    await waitFor(() => expect(within(sommaire).getByText("0/2")).toBeInTheDocument());

    await screen.findByText("0/2 critères");
    // `fireEvent` et non `userEvent` : ces cases viennent du HTML rendu par le
    // serveur, hors arbre React, et les vérifications de pointeur d'userEvent
    // les manquent une fois sur trois.
    fireEvent.click(screen.getAllByRole("checkbox")[0]!);

    await waitFor(() => expect(within(sommaire).getByText("1/2")).toBeInTheDocument());
  });

  it("n'affiche rien pour une leçon sans critère", async () => {
    criteresCourants = [];
    render(<App />);
    const sommaire = await screen.findByRole("navigation", {
      name: "Sommaire de la formation",
    });
    const ligne = within(sommaire).getByText("Exercice").closest("a");
    expect(ligne?.querySelector(".ligne-lecon-criteres")).toBeNull();
  });
});

describe("rafraîchissement concurrent (CR-R6)", () => {
  it("ne laisse pas un chargement parti avant la coche écraser l'état", async () => {
    // Scénario réel : revenir sur la fenêtre déclenche un rafraîchissement
    // discret ; cliquer dans la foulée fait arriver sa réponse APRÈS l'écriture.
    const attente: { resoudre?: () => void } = {};
    let leconsDemandees = 0;
    const fetchSimule = vi.mocked(globalThis.fetch).getMockImplementation()!;
    vi.mocked(globalThis.fetch).mockImplementation(async (entree, init) => {
      const url = String(entree);
      if (url.includes("/lecons/") && ++leconsDemandees === 2) {
        // Le second GET (celui du retour de focus) répond en dernier.
        await new Promise<void>((resoudre) => {
          attente.resoudre = resoudre;
        });
      }
      return fetchSimule(entree, init);
    });

    render(<App />);
    await screen.findByText("0/2 critères");

    window.dispatchEvent(new Event("focus"));
    await waitFor(() => expect(leconsDemandees).toBe(2));

    fireEvent.click(screen.getAllByRole("checkbox")[0]!);
    await screen.findByText("1/2 critères");

    // La réponse périmée arrive maintenant : elle ne doit rien écraser.
    attente.resoudre?.();
    await new Promise((resoudre) => setTimeout(resoudre, 20));

    expect(screen.getByText("1/2 critères")).toBeInTheDocument();
    expect((screen.getAllByRole("checkbox")[0] as HTMLInputElement).checked).toBe(true);
  });
});

describe("leçon modifiée sous les pieds (CR-R6)", () => {
  it("recharge la leçon quand le serveur ne connaît plus le critère", async () => {
    bascule = () => reponse({ erreur: "critère inconnu" }, 404);
    render(<App />);

    await screen.findByText("0/2 critères");
    const avant = appels.filter((appel) => appel.includes("/lecons/")).length;
    // La case est reprise au dernier moment : un re-rendu remplace le HTML de
    // la leçon, et cliquer sur un nœud détaché ne déclencherait rien.
    fireEvent.click(screen.getAllByRole("checkbox")[0]!);

    expect(await screen.findByText(/leçon a changé/)).toBeInTheDocument();
    expect(appels.filter((appel) => appel.includes("/lecons/")).length).toBeGreaterThan(
      avant,
    );
  });
});
