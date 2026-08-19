import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReponseFormation } from "../api";
import { PageFormation } from "./Formation";

function formation(): ReponseFormation {
  return {
    id: "formation-claude",
    titre: "Formation pratique Claude",
    description: "Le compagnon pratique de l'Academy.",
    avancement: {
      faites: 1,
      total: 3,
      pourcentage: 33,
      action: "reprendre",
      prochaine: { id: "hooks", titre: "Les hooks", moduleTitre: "Fondations" },
      orphelines: [],
      modules: [
        {
          id: "fondations",
          titre: "Fondations",
          description: "Le socle.",
          faites: 1,
          total: 2,
          lecons: [
            { id: "installer", titre: "Installer", faite: true },
            { id: "hooks", titre: "Les hooks", faite: false },
          ],
        },
        {
          id: "pratique",
          titre: "Pratique",
          faites: 0,
          total: 1,
          lecons: [{ id: "agents", titre: "Les agents", faite: false }],
        },
      ],
    },
  };
}

function afficher() {
  return render(
    <PageFormation
      formation={formation()}
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

describe("sommaire de la fiche — modules repliables (recette 2026-08-19)", () => {
  beforeEach(() => window.localStorage.clear());

  it("rend chaque module comme un repliable natif, déplié par défaut", () => {
    afficher();
    for (const titre of [/Fondations/, /^Pratique$/]) {
      const module = screen.getByText(titre).closest("details");
      expect(module).not.toBeNull();
      expect(module!.open).toBe(true);
      expect(screen.getByText(titre).closest("summary")).not.toBeNull();
    }
    expect(screen.getByRole("link", { name: /Installer/ })).toBeInTheDocument();
  });

  it("replie un module au clic sur son en-tête, et le redéplie au clic suivant", () => {
    afficher();
    const entete = screen.getByText(/Fondations/).closest("summary")!;
    const module = entete.closest("details")!;
    fireEvent.click(entete);
    expect(module.open).toBe(false);
    fireEvent.click(entete);
    expect(module.open).toBe(true);
  });

  it("partage l'état mémorisé avec le rail : même formation, même pli", () => {
    // La clé est celle du rail : replier ici, c'est replier là-bas.
    window.localStorage.setItem(
      "parcours.modulesReplies.formation-claude",
      JSON.stringify(["pratique"]),
    );
    afficher();
    expect(screen.getByText(/^Pratique$/).closest("details")!.open).toBe(false);
    expect(screen.getByText(/Fondations/).closest("details")!.open).toBe(true);
  });
});
