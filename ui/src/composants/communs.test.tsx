import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LienInterne } from "./communs";

describe("LienInterne", () => {
  const route = { nom: "lecon", fid: "prise-en-main", lid: "bienvenue" } as const;

  it("porte l'adresse exacte du routeur", () => {
    render(
      <LienInterne route={route} naviguer={() => undefined}>
        Bienvenue
      </LienInterne>,
    );
    expect(screen.getByRole("link", { name: "Bienvenue" })).toHaveAttribute(
      "href",
      "/formation/prise-en-main/lecon/bienvenue",
    );
  });

  it("navigue côté client sur un clic simple", async () => {
    const naviguer = vi.fn();
    render(
      <LienInterne route={route} naviguer={naviguer}>
        Bienvenue
      </LienInterne>,
    );
    await userEvent.click(screen.getByRole("link", { name: "Bienvenue" }));
    expect(naviguer).toHaveBeenCalledWith(route);
  });

  it("laisse le navigateur gérer un clic modifié (nouvel onglet)", async () => {
    const naviguer = vi.fn();
    const utilisateur = userEvent.setup();
    render(
      <LienInterne route={route} naviguer={naviguer}>
        Bienvenue
      </LienInterne>,
    );
    await utilisateur.keyboard("{Meta>}");
    await utilisateur.click(screen.getByRole("link", { name: "Bienvenue" }));
    await utilisateur.keyboard("{/Meta}");
    expect(naviguer).not.toHaveBeenCalled();
  });

  it("marque la page affichée pour les lecteurs d'écran", () => {
    render(
      <LienInterne route={route} naviguer={() => undefined} courante className="ligne">
        Bienvenue
      </LienInterne>,
    );
    const lien = screen.getByRole("link", { name: "Bienvenue" });
    expect(lien).toHaveAttribute("aria-current", "page");
    expect(lien).toHaveClass("ligne");
  });
});
