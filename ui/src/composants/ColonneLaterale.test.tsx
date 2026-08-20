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

describe("sommaire latéral — leçons à deux lignes (recette 2026-08-20)", () => {
  it("affiche la durée sous le titre, en ligne de métadonnées", () => {
    render(<ColonneLaterale {...proprietes} />);
    const lien = screen.getByRole("link", { name: /Se repérer/ });
    expect(lien.querySelector(".ligne-lecon-titre")!.textContent).toBe("Se repérer");
    expect(lien.querySelector(".ligne-lecon-meta")!.textContent).toBe("12 min");
  });

  it("ne rend aucune ligne de métadonnées quand il n'y a rien à y dire", () => {
    const sansDuree: ReponseFormation = structuredClone(formation);
    delete sansDuree.avancement.modules[0]!.lecons[1]!.duree;
    render(<ColonneLaterale {...proprietes} formation={sansDuree} />);
    const lien = screen.getByRole("link", { name: /Se repérer/ });
    expect(lien.querySelector(".ligne-lecon-meta")).toBeNull();
  });

  it("place le décompte de critères de la leçon ouverte dans ses métadonnées", () => {
    render(
      <ColonneLaterale {...proprietes} criteresCourants={{ faits: 1, total: 4 }} />,
    );
    const lien = screen.getByRole("link", { name: /Bienvenue/ });
    const meta = lien.querySelector(".ligne-lecon-meta")!;
    expect(meta).toHaveTextContent("8 min");
    expect(meta.querySelector(".ligne-lecon-criteres")!.textContent).toBe("1/4");
  });

  it("marque l'état par une pastille ronde : pleine si faite, vide sinon", () => {
    render(<ColonneLaterale {...proprietes} />);
    expect(
      screen
        .getByRole("link", { name: /Bienvenue/ })
        .querySelector(".lecon-etat.faite"),
    ).not.toBeNull();
    const aFaire = screen
      .getByRole("link", { name: /Se repérer/ })
      .querySelector(".lecon-etat");
    expect(aFaire).not.toBeNull();
    expect(aFaire!.classList.contains("faite")).toBe(false);
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

  it("affiche les modules terminés dans le rond de la colonne repliée, pas un pourcentage", () => {
    const { container } = render(<ColonneLaterale {...proprietes} replie />);
    const rond = container.querySelector(".spine-pourcent")!;
    expect(rond.textContent).toBe("1/2");
    expect(rond).toHaveAttribute("title", "1 module terminé sur 2");
  });
});

describe("sommaire latéral — en-tête de module à deux niveaux (recette 2026-08-20)", () => {
  it("sépare le libellé « Module NN · durée » du titre, qui se lit tel quel", () => {
    render(<ColonneLaterale {...proprietes} />);
    const entete = screen.getByText(/Découvrir/).closest(".module-entete")!;
    expect(entete.querySelector(".module-kicker")!.textContent).toBe(
      "Module 01 · 20 min",
    );
    expect(entete.querySelector(".module-titre")!.textContent).toBe("Découvrir");
  });

  it("laisse le libellé sans durée quand le module n'en a pas", () => {
    const sansDuree: ReponseFormation = structuredClone(formation);
    delete sansDuree.avancement.modules[0]!.duree;
    render(<ColonneLaterale {...proprietes} formation={sansDuree} />);
    const entete = screen.getByText(/Découvrir/).closest(".module-entete")!;
    expect(entete.querySelector(".module-kicker")!.textContent).toBe("Module 01");
  });
});
