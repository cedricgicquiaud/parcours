import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReponseFormation } from "../api";
import { PageFormation } from "./Formation";

function formation(surcharge: Partial<ReponseFormation> = {}): ReponseFormation {
  return {
    id: "formation-claude",
    titre: "Formation pratique Claude",
    description: "Le compagnon pratique de l'Academy.",
    avancement: {
      faites: 1,
      total: 2,
      pourcentage: 50,
      action: "reprendre",
      prochaine: { id: "hooks", titre: "Les hooks", moduleTitre: "Fondations" },
      orphelines: [],
      modules: [
        {
          id: "fondations",
          titre: "Fondations",
          faites: 1,
          total: 2,
          lecons: [
            { id: "installer", titre: "Installer", faite: true },
            { id: "hooks", titre: "Les hooks", faite: false },
          ],
        },
      ],
    },
    ...surcharge,
  };
}

function garnie(): ReponseFormation {
  const base = formation({
    couverture: "assets/couverture.png",
    presentationHtml: "<p>Un texte de présentation.</p>",
    objectifs: ["Piloter Claude Code", "Écrire un hook"],
    prerequis: ["Un terminal"],
    duree: 210,
  });
  const module = base.avancement.modules[0]!;
  module.description = "Le socle.";
  module.duree = 75;
  module.lecons[0]!.duree = 45;
  module.lecons[1]!.duree = 30;
  return base;
}

function afficher(reponse: ReponseFormation) {
  return render(
    <PageFormation
      formation={reponse}
      chargement={false}
      erreur={null}
      naviguer={vi.fn()}
      surNettoyer={vi.fn()}
      surReinitialiser={vi.fn()}
      occupe={false}
      surArchiver={vi.fn()}
      surSupprimer={vi.fn()}
    />,
  );
}

describe("fiche garnie (FI-R10)", () => {
  it("affiche la couverture, la présentation, les objectifs et les prérequis", () => {
    afficher(garnie());

    const couverture = screen.getByRole("img", { name: "Formation pratique Claude" });
    expect(couverture).toHaveAttribute("src", expect.stringContaining("couverture.png"));
    expect(screen.getByText("Un texte de présentation.")).toBeInTheDocument();

    const objectifs = screen.getByRole("list", { name: /saurez faire/i });
    expect(within(objectifs).getAllByRole("listitem")).toHaveLength(2);
    const prerequis = screen.getByRole("list", { name: /avant de commencer/i });
    expect(within(prerequis).getByText("Un terminal")).toBeInTheDocument();
  });

  it("annonce la durée en toutes lettres", () => {
    afficher(garnie());
    expect(screen.getByText(/3 h 30/)).toBeInTheDocument();
    expect(screen.getByText(/45 min/)).toBeInTheDocument();
  });

  it("décrit chaque module et sa durée", () => {
    afficher(garnie());
    expect(screen.getByText("Le socle.")).toBeInTheDocument();
    expect(screen.getByText(/1 h 15/)).toBeInTheDocument();
  });
});

describe("fiche nue — aucune régression (FI-R11, FI-R12)", () => {
  it("n'affiche aucune section vide quand la formation n'a que titre et description", () => {
    afficher(formation());

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText(/saurez faire/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/avant de commencer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/à propos/i)).not.toBeInTheDocument();
    // Le sommaire et l'action principale restent, eux.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Formation pratique Claude",
    );
    expect(screen.getByRole("button", { name: /Reprendre/ })).toBeInTheDocument();
  });

  it("n'annonce pas de durée quand il n'y en a pas", () => {
    afficher(formation());
    expect(screen.queryByText(/ min|\d h/)).not.toBeInTheDocument();
  });

  it("retire la couverture quand l'image est introuvable, sans laisser de trou", () => {
    afficher(garnie());
    const couverture = screen.getByRole("img", { name: "Formation pratique Claude" });
    fireEvent.error(couverture);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
