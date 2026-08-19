import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Compte, ReponseCatalogue, ReponseFormation } from "../api";
import { CLE_MODULES_REPLIES } from "../preferences";
import type { EtatRecherche } from "../recherche";
import { ColonneLaterale } from "./ColonneLaterale";

const formation: ReponseFormation = {
  id: "prise-en-main",
  titre: "Prise en main de Parcours",
  duree: 165,
  avancement: {
    faites: 2,
    total: 3,
    pourcentage: 67,
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
        faites: 1,
        total: 1,
        lecons: [{ id: "anatomie", titre: "Anatomie", faite: true, duree: 15 }],
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

  it("mémorise l'état replié par formation et le restaure au prochain rendu", () => {
    const premier = render(<ColonneLaterale {...proprietes} />);
    fireEvent.click(screen.getByText(/Écrire/).closest("summary")!);
    premier.unmount();

    render(<ColonneLaterale {...proprietes} />);
    expect(screen.getByText(/Écrire/).closest("details")!.open).toBe(false);
    expect(screen.getByText(/Découvrir/).closest("details")!.open).toBe(true);
  });

  it("déplie automatiquement le module de la leçon ouverte, même mémorisé replié", () => {
    window.localStorage.setItem(
      CLE_MODULES_REPLIES + "prise-en-main",
      JSON.stringify(["decouvrir", "ecrire"]),
    );
    render(<ColonneLaterale {...proprietes} />);
    expect(screen.getByText(/Découvrir/).closest("details")!.open).toBe(true);
    expect(screen.getByText(/Écrire/).closest("details")!.open).toBe(false);
  });
});

describe("rail au catalogue — compteurs en modules (recette 2026-08-19)", () => {
  const catalogueFixture: ReponseCatalogue = {
    progressionReinitialisee: false,
    archivees: [],
    corbeille: [],
    formations: [
      {
        statut: "valide",
        id: "prise-en-main",
        titre: "Prise en main de Parcours",
        modules: 2,
        modulesFaits: 1,
        lecons: 31,
        faites: 12,
        pourcentage: 39,
        action: "reprendre",
        prochaine: null,
      },
    ],
  };

  function rendreAuCatalogue() {
    return render(
      <ColonneLaterale
        {...proprietes}
        route={{ nom: "catalogue" }}
        formation={null}
        leconCourante={null}
        catalogue={catalogueFixture}
      />,
    );
  }

  it("n'affiche plus de décompte sous « Mes formations »", () => {
    rendreAuCatalogue();
    expect(screen.getByText("Mes formations")).toBeInTheDocument();
    expect(screen.queryByText(/leçon/)).not.toBeInTheDocument();
    expect(screen.queryByText(/terminée/)).not.toBeInTheDocument();
  });

  it("compte les modules terminés sur chaque ligne de formation", () => {
    rendreAuCatalogue();
    const ligne = screen.getByText("Prise en main de Parcours").closest("a")!;
    expect(ligne).toHaveTextContent("1/2");
    expect(ligne).not.toHaveTextContent("12/31");
  });
});

describe("compteurs de formation — en modules, pas en leçons (recette 2026-08-19)", () => {
  it("compte les modules terminés dans l'en-tête du rail", () => {
    const { container } = render(<ColonneLaterale {...proprietes} />);
    const entete = container.querySelector(".rail-titre-formation")!;
    // 1 module terminé (Écrire) sur 2 — pas 2 leçons sur 3.
    expect(entete).toHaveTextContent("1/2");
    expect(entete).not.toHaveTextContent("2/3");
  });

  it("montre un point par module dans la colonne repliée", () => {
    const { container } = render(<ColonneLaterale {...proprietes} replie />);
    const points = container.querySelectorAll(".spine-point");
    expect(points).toHaveLength(2);
    expect(points[0]!.className).toContain("courante"); // Bienvenue ∈ Découvrir
    expect(points[0]!.className).not.toContain("faite");
    expect(points[1]!.className).toContain("faite"); // Écrire est terminé
    expect(screen.getByTitle("1 module sur 2")).toBeInTheDocument();
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
