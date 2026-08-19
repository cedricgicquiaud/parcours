import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Compte, ReponseFormation } from "../api";
import { ColonneLaterale } from "../composants/ColonneLaterale";
import { CLE_MODULES_REPLIES } from "../preferences";
import type { EtatRecherche } from "../recherche";
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
    for (const titre of [/Fondations/, /Pratique/]) {
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
      CLE_MODULES_REPLIES + "formation-claude",
      JSON.stringify(["pratique"]),
    );
    afficher();
    expect(screen.getByText(/Pratique/).closest("details")!.open).toBe(false);
    expect(screen.getByText(/Fondations/).closest("details")!.open).toBe(true);
  });

  it("replie en direct dans le rail quand on replie depuis la fiche", () => {
    // Sur l'écran d'une formation, le rail et la fiche montrent le sommaire
    // en même temps : un pli fait d'un côté doit se voir de l'autre.
    const reponse = formation();
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
    const recherche: EtatRecherche = {
      requete: "",
      setRequete: () => undefined,
      effacer: () => undefined,
      active: false,
      chargement: false,
      reponse: null,
      erreur: null,
    };
    render(
      <>
        <ColonneLaterale
          route={{ nom: "formation", fid: reponse.id }}
          naviguer={vi.fn()}
          catalogue={null}
          formation={reponse}
          leconCourante={null}
          criteresCourants={null}
          recherche={recherche}
          mode="clair"
          basculerMode={() => undefined}
          replie={false}
          basculerReplie={() => undefined}
          compte={compte}
          surDeconnexion={() => undefined}
          edition={false}
          basculerEdition={() => undefined}
        />
        <PageFormation
          formation={reponse}
          chargement={false}
          erreur={null}
          naviguer={vi.fn()}
          surNettoyer={vi.fn()}
          surReinitialiser={vi.fn()}
          occupe={false}
        />
      </>,
    );

    const sommaires = screen
      .getAllByText(/Pratique/)
      .map((titre) => titre.closest("details")!);
    const fiche = sommaires.find((module) =>
      module.classList.contains("module-fiche"),
    )!;
    const rail = sommaires.find(
      (module) => !module.classList.contains("module-fiche"),
    )!;

    fireEvent.click(within(fiche).getByText(/Pratique/).closest("summary")!);
    expect(rail.open).toBe(false);
    expect(fiche.open).toBe(false);
  });
});
