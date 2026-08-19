import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Compte, ReponseFormation } from "../api";
import type { EtatRecherche } from "../recherche";
import { ColonneLaterale } from "./ColonneLaterale";

const formation: ReponseFormation = {
  id: "prise-en-main",
  titre: "Prise en main de Parcours",
  duree: 165,
  avancement: {
    faites: 1,
    total: 2,
    pourcentage: 50,
    action: "reprendre",
    prochaine: { id: "anatomie", titre: "Anatomie", moduleTitre: "Écrire" },
    orphelines: [],
    modules: [
      {
        id: "decouvrir",
        titre: "Découvrir",
        faites: 1,
        total: 2,
        duree: 20,
        lecons: [
          { id: "bienvenue", titre: "Bienvenue", faite: true, duree: 8 },
          { id: "se-reperer", titre: "Se repérer", faite: false, duree: 12 },
        ],
      },
      {
        id: "ecrire",
        titre: "Écrire",
        faites: 0,
        total: 1,
        lecons: [{ id: "anatomie", titre: "Anatomie", faite: false, duree: 15 }],
      },
    ],
  },
};

const recherche: EtatRecherche = {
  requete: "",
  setRequete: () => undefined,
  effacer: () => undefined,
  active: false,
  chargement: false,
  reponse: null,
  erreur: null,
};

const compte: Compte = {
  id: 1,
  identifiant: "cedric@parcours.test",
  nom: "Cédric",
  role: "lecteur",
  actif: true,
  emailVerifie: true,
  creeLe: "2026-08-18",
  derniereConnexion: null,
};

const proprietes = {
  route: { nom: "lecon", fid: "prise-en-main", lid: "bienvenue" } as const,
  naviguer: vi.fn(),
  catalogue: null,
  formation,
  leconCourante: "bienvenue",
  criteresCourants: null,
  recherche,
  mode: "clair" as const,
  basculerMode: () => undefined,
  replie: false,
  basculerReplie: () => undefined,
  compte,
  surDeconnexion: () => undefined,
  edition: false,
  basculerEdition: () => undefined,
};

describe("sommaire latéral — modules repliables (recette 2026-08-19)", () => {
  beforeEach(() => window.localStorage.clear());

  it("rend chaque module comme un repliable natif, déplié par défaut", () => {
    render(<ColonneLaterale {...proprietes} />);
    for (const titre of [/Découvrir/, /Écrire/]) {
      const module = screen.getByText(titre).closest("details");
      expect(module).not.toBeNull();
      expect(module!.open).toBe(true);
      expect(screen.getByText(titre).closest("summary")).not.toBeNull();
    }
    expect(screen.getByRole("link", { name: /Bienvenue/ })).toBeInTheDocument();
  });

  it("replie un module au clic sur son en-tête, et le redéplie au clic suivant", () => {
    render(<ColonneLaterale {...proprietes} />);
    const entete = screen.getByText(/Écrire/).closest("summary")!;
    const module = entete.closest("details")!;
    fireEvent.click(entete);
    expect(module.open).toBe(false);
    fireEvent.click(entete);
    expect(module.open).toBe(true);
  });
});

describe("sommaire latéral — durées (recette 2026-08-19)", () => {
  it("affiche la durée sur l'en-tête de chaque module qui en a une", () => {
    render(<ColonneLaterale {...proprietes} />);
    expect(screen.getByText(/Découvrir/).closest(".module-entete")).toHaveTextContent(
      "20 min",
    );
  });

  it("n'affiche PAS la durée sur les lignes de leçons — trop dense", () => {
    render(<ColonneLaterale {...proprietes} />);
    expect(screen.getByRole("link", { name: /Se repérer/ })).not.toHaveTextContent(
      /min/,
    );
    expect(screen.getByRole("link", { name: /Bienvenue/ })).not.toHaveTextContent(
      /min/,
    );
  });

  it("laisse l'en-tête de module sans durée quand le module n'en a pas", () => {
    const sansDuree: ReponseFormation = structuredClone(formation);
    delete sansDuree.avancement.modules[0]!.duree;
    render(<ColonneLaterale {...proprietes} formation={sansDuree} />);
    expect(
      screen.getByText(/Découvrir/).closest(".module-entete"),
    ).not.toHaveTextContent(/min/);
  });
});
