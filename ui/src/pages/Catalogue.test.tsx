import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ReponseCatalogue } from "../api";
import { Catalogue } from "./Catalogue";

function catalogue(surcharge: Partial<ReponseCatalogue> = {}): ReponseCatalogue {
  return {
    progressionReinitialisee: false,
    formations: [
      {
        statut: "valide",
        id: "formation-claude",
        titre: "Formation pratique Claude",
        description: "Compagnon pratique",
        modules: 2,
        lecons: 31,
        faites: 12,
        pourcentage: 39,
        action: "reprendre",
        prochaine: { id: "les-hooks", titre: "Les hooks", moduleTitre: "Module 01" },
      },
      {
        statut: "valide",
        id: "ecrire-web",
        titre: "Écrire pour le web",
        modules: 1,
        lecons: 12,
        faites: 0,
        pourcentage: 0,
        action: "commencer",
        prochaine: { id: "intro", titre: "Intro", moduleTitre: "Module 01" },
      },
      {
        statut: "valide",
        id: "sqlite",
        titre: "SQLite en pratique",
        modules: 1,
        lecons: 12,
        faites: 12,
        pourcentage: 100,
        action: "revoir",
        prochaine: { id: "schema", titre: "Schéma", moduleTitre: "Module 01" },
      },
      { statut: "invalide", id: "mauvais-dossier", erreur: "modules[0].id manquant" },
    ],
    ...surcharge,
  };
}

const proprietes = {
  chargement: false,
  erreur: null,
  recharger: () => undefined,
  naviguer: () => undefined,
};

describe("Catalogue (U-R1, U-R8)", () => {
  it("met la formation en cours en tête avec sa prochaine leçon", () => {
    render(<Catalogue {...proprietes} catalogue={catalogue()} />);
    expect(screen.getByText("EN COURS")).toBeInTheDocument();
    expect(screen.getByText("Module 01 · Les hooks")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reprendre/ })).toBeInTheDocument();
  });

  it("n'affiche qu'un seul bouton d'action par carte, adapté à l'avancement", () => {
    render(<Catalogue {...proprietes} catalogue={catalogue()} />);
    expect(screen.getByRole("button", { name: "Commencer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revoir" })).toBeInTheDocument();
  });

  it("affiche une formation invalide avec son erreur, sans lien", () => {
    render(<Catalogue {...proprietes} catalogue={catalogue()} />);
    expect(screen.getByText("mauvais-dossier")).toBeInTheDocument();
    expect(screen.getByText("modules[0].id manquant")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /mauvais-dossier/ }),
    ).not.toBeInTheDocument();
  });

  it("affiche la mention de non-affiliation (U-R8)", () => {
    render(<Catalogue {...proprietes} catalogue={catalogue()} />);
    expect(
      screen.getByText(/non affilié à Anthropic/),
    ).toBeInTheDocument();
  });

  it("propose de réessayer quand le serveur ne répond pas", async () => {
    const recharger = vi.fn();
    render(
      <Catalogue
        {...proprietes}
        catalogue={null}
        erreur="Parcours ne répond pas"
        recharger={recharger}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(recharger).toHaveBeenCalledOnce();
  });

  it("montre l'état vide quand aucune formation n'est présente", () => {
    render(
      <Catalogue {...proprietes} catalogue={{ formations: [], progressionReinitialisee: false }} />,
    );
    expect(screen.getByText("Aucune formation.")).toBeInTheDocument();
  });

  it("affiche le bandeau de progression réinitialisée (P-R1)", () => {
    render(
      <Catalogue
        {...proprietes}
        catalogue={catalogue({ progressionReinitialisee: true })}
      />,
    );
    expect(
      screen.getByText(/Progression réinitialisée \(base corrompue sauvegardée\)/),
    ).toBeInTheDocument();
  });

  it("relaie l'erreur globale du dossier de formations (F-R1)", () => {
    render(
      <Catalogue
        {...proprietes}
        catalogue={catalogue({ erreurGlobale: "dossier introuvable : /nulle-part" })}
      />,
    );
    expect(screen.getByText(/dossier introuvable/)).toBeInTheDocument();
  });

  it("ouvre la prochaine leçon depuis « Reprendre » (P-R3)", async () => {
    const naviguer = vi.fn();
    render(<Catalogue {...proprietes} catalogue={catalogue()} naviguer={naviguer} />);
    const carte = screen.getByText("EN COURS").closest("section")!;
    await userEvent.click(within(carte).getByRole("button", { name: /Reprendre/ }));
    expect(naviguer).toHaveBeenCalledWith({
      nom: "lecon",
      fid: "formation-claude",
      lid: "les-hooks",
    });
  });
});
