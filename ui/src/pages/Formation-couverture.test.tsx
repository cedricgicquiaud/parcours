import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReponseFormation } from "../api";
import { PageFormation } from "./Formation";

function formation(surcharge: Partial<ReponseFormation> = {}): ReponseFormation {
  return {
    id: "formation-claude",
    titre: "Formation pratique Claude",
    avancement: {
      faites: 0,
      total: 1,
      pourcentage: 0,
      action: "commencer",
      prochaine: { id: "installer", titre: "Installer", moduleTitre: "Fondations" },
      orphelines: [],
      modules: [
        {
          id: "fondations",
          titre: "Fondations",
          faites: 0,
          total: 1,
          lecons: [{ id: "installer", titre: "Installer", faite: false }],
        },
      ],
    },
    ...surcharge,
  };
}

function afficher(props: { estAdmin?: boolean; surCouverture?: (fichier: File) => Promise<void> } = {}) {
  const surCouverture = props.surCouverture ?? vi.fn().mockResolvedValue(undefined);
  render(
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
      estAdmin={props.estAdmin ?? true}
      surCouverture={surCouverture}
    />,
  );
  return { surCouverture };
}

const IMAGE = new File(["png"], "couverture.png", { type: "image/png" });

describe("dépôt d'une couverture (FI-R16)", () => {
  it("propose la zone de dépôt à un administrateur", () => {
    afficher({ estAdmin: true });
    expect(screen.getByLabelText(/couverture/i)).toBeInTheDocument();
  });

  it("ne la propose pas à un lecteur", () => {
    afficher({ estAdmin: false });
    expect(screen.queryByLabelText(/couverture/i)).not.toBeInTheDocument();
  });

  it("transmet le fichier choisi", async () => {
    const { surCouverture } = afficher();
    const champ = screen.getByLabelText(/couverture/i) as HTMLInputElement;
    fireEvent.change(champ, { target: { files: [IMAGE] } });

    await waitFor(() => expect(surCouverture).toHaveBeenCalledWith(IMAGE));
  });

  it("affiche l'erreur du serveur sans masquer la zone", async () => {
    const surCouverture = vi.fn().mockRejectedValue(new Error("2 Mo au plus"));
    afficher({ surCouverture });
    fireEvent.change(screen.getByLabelText(/couverture/i), {
      target: { files: [IMAGE] },
    });

    // Les messages de Parcours passent tous par le bandeau `role="status"`.
    expect(await screen.findByRole("status")).toHaveTextContent("2 Mo au plus");
    expect(screen.getByLabelText(/couverture/i)).toBeInTheDocument();
  });
});
