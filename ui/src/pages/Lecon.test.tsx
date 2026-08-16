import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ReponseLecon } from "../api";
import { PageLecon } from "./Lecon";

function lecon(surcharge: Partial<ReponseLecon> = {}): ReponseLecon {
  return {
    formationId: "formation-claude",
    formationTitre: "Formation pratique Claude",
    leconId: "les-hooks",
    titre: "Les hooks",
    moduleId: "fondations",
    moduleTitre: "Fondations",
    html:
      '<p>Un hook se déclenche à chaque écriture.</p>' +
      '<details class="repliable repliable-solution"><summary>Solution</summary>' +
      '<div class="repliable-corps">Le contenu de la solution.</div></details>',
    faite: false,
    criteres: [],
    criteresTronques: false,
    position: 4,
    total: 5,
    precedente: { id: "sous-agents", titre: "Les sous-agents" },
    suivante: { id: "cloture", titre: "Clôture du module" },
    ...surcharge,
  };
}

const proprietes = {
  chargement: false,
  erreur: null,
  erreurCoche: null,
  naviguer: () => undefined,
  surBasculerFaite: () => undefined,
  surBasculerCritere: () => Promise.resolve(true),
  // Les tests historiques décrivent un auteur au travail (ED-R8).
  peutEcrire: true,
};

describe("PageLecon (U-R3, U-R4, U-R5)", () => {
  it("affiche le fil d'Ariane et le titre, un seul h1 (U-R7)", () => {
    render(<PageLecon {...proprietes} lecon={lecon()} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Les hooks");
    expect(screen.getByText(/Leçon 4 sur 5/)).toBeInTheDocument();
  });

  it("garde la solution repliée : aucun attribut open dans le DOM initial (U-R4)", () => {
    const { container } = render(<PageLecon {...proprietes} lecon={lecon()} />);
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details!.hasAttribute("open")).toBe(false);
  });

  it("bascule la coche et annonce son état (U-R3)", async () => {
    const surBasculerFaite = vi.fn();
    const { rerender } = render(
      <PageLecon {...proprietes} lecon={lecon()} surBasculerFaite={surBasculerFaite} />,
    );
    const bouton = screen.getByRole("button", { name: /Marquer comme terminé/ });
    expect(bouton).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(bouton);
    expect(surBasculerFaite).toHaveBeenCalledOnce();

    rerender(<PageLecon {...proprietes} lecon={lecon({ faite: true })} />);
    expect(screen.getByRole("button", { name: /Terminé/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("affiche le retour arrière quand la coche a échoué (U-R3)", () => {
    render(
      <PageLecon
        {...proprietes}
        lecon={lecon()}
        erreurCoche="Progression non enregistrée : Parcours ne répond pas"
      />,
    );
    expect(screen.getByText(/Progression non enregistrée/)).toBeInTheDocument();
  });

  it("nomme les leçons voisines dans la barre d'actions", () => {
    render(<PageLecon {...proprietes} lecon={lecon()} />);
    expect(screen.getByRole("button", { name: /Les sous-agents/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clôture du module/ })).toBeInTheDocument();
  });

  it("ramène au sommaire depuis la dernière leçon (U-R3)", async () => {
    const naviguer = vi.fn();
    render(
      <PageLecon {...proprietes} lecon={lecon({ suivante: null })} naviguer={naviguer} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Retour au sommaire/ }));
    expect(naviguer).toHaveBeenCalledWith({ nom: "formation", fid: "formation-claude" });
  });

  it("affiche un message et un retour quand la leçon est illisible (U-R5)", () => {
    render(
      <PageLecon
        {...proprietes}
        lecon={null}
        erreur="fichier de leçon introuvable ou illisible : lecons/hooks.md"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/introuvable ou illisible/);
  });

  it("affiche un squelette pendant le chargement (U-R5)", () => {
    const { container } = render(
      <PageLecon {...proprietes} lecon={null} chargement />,
    );
    expect(container.querySelectorAll(".squelette").length).toBeGreaterThan(0);
  });

  it("intercepte les liens internes rendus par le serveur (F-R12)", async () => {
    const naviguer = vi.fn();
    render(
      <PageLecon
        {...proprietes}
        naviguer={naviguer}
        lecon={lecon({
          html:
            '<p><a href="/formation/formation-claude/lecon/cloture" data-lecon="cloture">Voir la clôture</a></p>',
        })}
      />,
    );
    await userEvent.click(screen.getByRole("link", { name: "Voir la clôture" }));
    expect(naviguer).toHaveBeenCalledWith({
      nom: "lecon",
      fid: "formation-claude",
      lid: "cloture",
    });
  });
});

describe("en lecture — aucun geste d'écriture (ED-R7, ED-R9)", () => {
  const enLecture = { ...proprietes, peutEcrire: false };

  it("ne propose pas de modifier la leçon", () => {
    render(<PageLecon {...enLecture} lecon={lecon()} />);
    expect(
      screen.queryByRole("button", { name: /Modifier cette leçon/ }),
    ).not.toBeInTheDocument();
  });

  it("laisse la progression intacte", () => {
    render(<PageLecon {...enLecture} lecon={lecon()} />);
    expect(
      screen.getByRole("button", { name: /Marquer comme terminé/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Les hooks");
  });

  it("rend le bouton quand l'édition est allumée (ED-R8)", () => {
    render(<PageLecon {...proprietes} lecon={lecon()} />);
    expect(
      screen.getByRole("button", { name: /Modifier cette leçon/ }),
    ).toBeInTheDocument();
  });
});
