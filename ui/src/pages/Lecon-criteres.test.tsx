import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { EtatCritere, ReponseLecon } from "../api";
import { lecon as leconDeBase } from "./fixtures-lecon";
import { PageLecon } from "./Lecon";

const CRITERES: EtatCritere[] = [
  { id: "aaaaaaaaaaaa-0", texte: "la commande affiche les 7 cours", coche: false },
  { id: "bbbbbbbbbbbb-0", texte: "le dépôt git est initialisé", coche: true },
];

function html(criteres: EtatCritere[]): string {
  const cases = criteres
    .map(
      (critere) =>
        `<li><input type="checkbox" data-critere="${critere.id}"${
          critere.coche ? " checked" : ""
        }> ${critere.texte}</li>`,
    )
    .join("");
  return `<p>Un exercice.</p><ul>${cases}</ul>`;
}

function lecon(surcharge: Partial<ReponseLecon> = {}): ReponseLecon {
  const criteres = surcharge.criteres ?? CRITERES;
  return leconDeBase({
    leconId: "exercice",
    titre: "Exercice 1.1",
    html: html(criteres),
    criteres,
    position: 1,
    total: 3,
    precedente: null,
    suivante: null,
    ...surcharge,
  });
}

function afficher(surcharge: Partial<ReponseLecon> = {}, props: Partial<Props> = {}) {
  const surBasculerCritere = props.surBasculerCritere ?? vi.fn().mockResolvedValue(true);
  const rendu = render(
    <PageLecon
      lecon={lecon(surcharge)}
      chargement={false}
      erreur={null}
      erreurCoche={null}
      naviguer={vi.fn()}
      surBasculerFaite={props.surBasculerFaite ?? vi.fn()}
      surBasculerCritere={surBasculerCritere}
    />,
  );
  return { ...rendu, surBasculerCritere };
}

interface Props {
  surBasculerCritere: (id: string, coche: boolean) => Promise<boolean>;
  surBasculerFaite: () => void;
}

function casesACocher(): HTMLInputElement[] {
  return screen.getAllByRole("checkbox") as HTMLInputElement[];
}

describe("cocher un critère depuis la leçon (CR-R6, CR-R9)", () => {
  it("affiche le décompte des critères", () => {
    afficher();
    expect(screen.getByText("1/2 critères")).toBeInTheDocument();
  });

  it("n'affiche aucun décompte quand la leçon n'a pas de critère", () => {
    afficher({ criteres: [] });
    expect(screen.queryByText(/critères/)).not.toBeInTheDocument();
  });

  it("appelle le serveur et met le décompte à jour aussitôt", async () => {
    const { surBasculerCritere } = afficher();
    fireEvent.click(casesACocher()[0]!);

    expect(surBasculerCritere).toHaveBeenCalledWith("aaaaaaaaaaaa-0", true);
    expect(await screen.findByText("2/2 critères")).toBeInTheDocument();
  });

  it("décoche un critère coché", async () => {
    const { surBasculerCritere } = afficher();
    fireEvent.click(casesACocher()[1]!);

    expect(surBasculerCritere).toHaveBeenCalledWith("bbbbbbbbbbbb-0", false);
    expect(await screen.findByText("0/2 critères")).toBeInTheDocument();
  });

  it("remet la case dans son état d'avant quand le serveur refuse", async () => {
    const surBasculerCritere = vi.fn().mockResolvedValue(false);
    afficher({}, { surBasculerCritere });

    const premiere = casesACocher()[0]!;
    fireEvent.click(premiere);

    await waitFor(() => expect(premiere.checked).toBe(false));
    expect(screen.getByText("1/2 critères")).toBeInTheDocument();
  });
});

describe("critères ouverts et fin de leçon (CR-R11)", () => {
  it("avertit sans bloquer quand on termine avec des critères ouverts", async () => {
    const surBasculerFaite = vi.fn();
    afficher({}, { surBasculerFaite });

    await userEvent.click(screen.getByRole("button", { name: /Marquer comme terminé/ }));

    expect(surBasculerFaite).toHaveBeenCalled();
    expect(screen.getByText(/1 critère reste ouvert/)).toBeInTheDocument();
  });

  it("affiche l'avertissement DANS la barre d'actions, là où l'on vient de cliquer", async () => {
    // Le message existait déjà, mais en tête d'article : sur une leçon longue,
    // il naissait hors de l'écran (recette 2026-08-16).
    const { container } = afficher();

    const bouton = screen.getByRole("button", { name: /Marquer comme terminé/ });
    await userEvent.click(bouton);

    const barre = container.querySelector(".barre-actions");
    expect(barre).not.toBeNull();
    expect(barre).toContainElement(bouton);
    expect(barre).toHaveTextContent(/1 critère reste ouvert/);
  });

  it("n'avertit pas quand tous les critères sont cochés", () => {
    afficher({ criteres: CRITERES.map((critere) => ({ ...critere, coche: true })) });
    expect(screen.queryByText(/reste ouvert/)).not.toBeInTheDocument();
  });
});

describe("stabilité du contenu rendu (régression 2026-08-16)", () => {
  it("garde la case cochée quand le composant se rend à nouveau", async () => {
    // React compare la RÉFÉRENCE de l'objet dangerouslySetInnerHTML : sans mémo,
    // chaque rendu réécrivait le HTML et vidait la case qu'on venait de cocher.
    afficher();
    const premiere = casesACocher()[0]!;
    fireEvent.click(premiere);

    await screen.findByText("2/2 critères");
    expect((casesACocher()[0] as HTMLInputElement).checked).toBe(true);
  });
});

describe("accessibilité du décompte (SPEC § 7)", () => {
  it("annonce le décompte sans voler le focus", () => {
    afficher();
    const decompte = screen.getByText("1/2 critères");
    expect(decompte.closest("[aria-live]")).toHaveAttribute("aria-live", "polite");
  });
});
