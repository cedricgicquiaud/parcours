import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ReponseLecon } from "../api";
import { lecon as leconDeBase, proprietesLecon } from "./fixtures-lecon";
import { PageLecon } from "./Lecon";

const lecon = (surcharge: Partial<ReponseLecon> = {}): ReponseLecon =>
  leconDeBase({
    formationId: "fil-rouge",
    formationTitre: "Formation fil rouge",
    leconId: "deux-hooks",
    titre: "Deux hooks",
    html: "<p>Un hook se déclenche à chaque écriture.</p>",
    criteres: [{ id: "c-aaaa1111", texte: "Créer le hook", coche: false }],
    position: 4,
    total: 6,
    precedente: null,
    suivante: null,
    ...surcharge,
  });

const proprietes = { ...proprietesLecon, peutEcrire: false };

const UNE = [{ id: "installer", titre: "Installer Claude Code" }];
const DEUX = [...UNE, { id: "claudemd", titre: "Écrire un CLAUDE.md" }];
const TROIS = [...DEUX, { id: "initialiser", titre: "Initialiser le projet" }];

describe("le bandeau des leçons supposées (SU-R9, SU-R10, SU-R13)", () => {
  it("nomme la leçon manquante, et son lien y navigue", async () => {
    const naviguer = vi.fn();
    render(
      <PageLecon {...proprietes} naviguer={naviguer} lecon={lecon({ suppose: UNE })} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Cette leçon suppose que vous ayez terminé Installer Claude Code.",
    );
    await userEvent.click(screen.getByRole("link", { name: "Installer Claude Code" }));
    expect(naviguer).toHaveBeenCalledWith({
      nom: "lecon",
      fid: "fil-rouge",
      lid: "installer",
    });
  });

  it("joint deux leçons par « et » (SU-R10)", () => {
    render(<PageLecon {...proprietes} lecon={lecon({ suppose: DEUX })} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Installer Claude Code et Écrire un CLAUDE.md.",
    );
  });

  it("joint trois leçons par des virgules puis « et » (SU-R10)", () => {
    render(<PageLecon {...proprietes} lecon={lecon({ suppose: TROIS })} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Installer Claude Code, Écrire un CLAUDE.md et Initialiser le projet.",
    );
    expect(within(screen.getByRole("status")).getAllByRole("link")).toHaveLength(3);
  });

  it("apparaît sous l'en-tête et AVANT le contenu de la leçon (SU-R9)", () => {
    const { container } = render(
      <PageLecon {...proprietes} lecon={lecon({ suppose: UNE })} />,
    );
    const bandeau = screen.getByRole("status");
    const contenu = container.querySelector(".contenu-lecon");
    expect(contenu).not.toBeNull();
    // Le bandeau doit précéder le contenu dans l'ordre du document.
    expect(
      bandeau.compareDocumentPosition(contenu!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("n'affiche rien quand la leçon ne suppose rien", () => {
    render(<PageLecon {...proprietes} lecon={lecon()} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("le bandeau ne confisque rien (SU-R11)", () => {
  it("laisse le contenu, les critères et « Marquer comme terminé » intacts", () => {
    const { container } = render(
      <PageLecon {...proprietes} lecon={lecon({ suppose: DEUX })} />,
    );
    expect(screen.getByText(/Un hook se déclenche/)).toBeInTheDocument();
    expect(screen.getByText("0/1 critères")).toBeInTheDocument();
    const bouton = screen.getByRole("button", { name: /Marquer comme terminé/ });
    expect(bouton).toBeEnabled();
    // Rien n'est grisé ni masqué : aucun conteneur désactivé n'apparaît.
    expect(container.querySelectorAll("[disabled], [aria-disabled='true']")).toHaveLength(
      0,
    );
  });
});
