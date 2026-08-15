import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, type ReponseRechercheApi } from "./api";
import { morceauxSurlignes, useRecherche } from "./recherche";

function Sonde({ fid }: { fid: string | null }) {
  const recherche = useRecherche(fid);
  return (
    <div>
      <input
        aria-label="requête"
        value={recherche.requete}
        onChange={(evenement) => recherche.setRequete(evenement.target.value)}
      />
      <span data-testid="active">{String(recherche.active)}</span>
      <span data-testid="total">{recherche.reponse?.total ?? "—"}</span>
      <span data-testid="message">{recherche.reponse?.message ?? ""}</span>
      <span data-testid="premier">{recherche.reponse?.resultats[0]?.leconId ?? ""}</span>
    </div>
  );
}

function reponse(leconId: string, total = 1): ReponseRechercheApi {
  return {
    resultats: [
      {
        leconId,
        titre: "Les hooks",
        moduleTitre: "Fondations",
        extrait: "…un hook se déclenche…",
        occurrences: [{ debut: 4, longueur: 4 }],
      },
    ],
    total,
    nonIndexees: 0,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useRecherche (U-R9, S-R4)", () => {
  it("n'interroge pas le serveur sous 2 caractères", async () => {
    const espion = vi.spyOn(api, "rechercher");
    render(<Sonde fid="formation-claude" />);
    await userEvent.type(screen.getByLabelText("requête"), "h");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(espion).not.toHaveBeenCalled();
    expect(screen.getByTestId("active")).toHaveTextContent("false");
  });

  it("attend 200 ms sans frappe avant d'interroger le serveur", async () => {
    const espion = vi.spyOn(api, "rechercher").mockResolvedValue(reponse("hooks"));
    render(<Sonde fid="formation-claude" />);
    await userEvent.type(screen.getByLabelText("requête"), "hoo");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    expect(espion).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(espion).toHaveBeenCalledOnce();
    expect(espion).toHaveBeenCalledWith("formation-claude", "hoo", expect.anything());
  });

  it("ignore une réponse plus ancienne que la requête courante", async () => {
    let resoudreLente: ((valeur: ReponseRechercheApi) => void) | null = null;
    vi.spyOn(api, "rechercher")
      .mockImplementationOnce(
        () =>
          new Promise<ReponseRechercheApi>((resoudre) => {
            resoudreLente = resoudre;
          }),
      )
      .mockResolvedValueOnce(reponse("recente", 2));

    render(<Sonde fid="formation-claude" />);
    const champ = screen.getByLabelText("requête");

    await userEvent.type(champ, "ho");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    await userEvent.type(champ, "oks");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    await waitFor(() => expect(screen.getByTestId("premier")).toHaveTextContent("recente"));

    // La réponse lente arrive après : elle ne doit plus rien écraser.
    await act(async () => {
      resoudreLente?.(reponse("perimee", 99));
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(screen.getByTestId("premier")).toHaveTextContent("recente");
    expect(screen.getByTestId("total")).toHaveTextContent("2");
  });

  it("relaie le message « saisir au moins 2 caractères » du serveur", async () => {
    vi.spyOn(api, "rechercher").mockResolvedValue({
      resultats: [],
      total: 0,
      nonIndexees: 0,
      message: "saisir au moins 2 caractères",
    });
    render(<Sonde fid="formation-claude" />);
    await userEvent.type(screen.getByLabelText("requête"), "h-h");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    await waitFor(() =>
      expect(screen.getByTestId("message")).toHaveTextContent(
        "saisir au moins 2 caractères",
      ),
    );
  });
});

describe("morceauxSurlignes (S-R6)", () => {
  it("découpe l'extrait selon les positions renvoyées par l'API", () => {
    expect(morceauxSurlignes("un hook ici", [{ debut: 3, longueur: 4 }])).toEqual([
      { texte: "un ", surligne: false },
      { texte: "hook", surligne: true },
      { texte: " ici", surligne: false },
    ]);
  });

  it("rend l'extrait tel quel sans occurrence", () => {
    expect(morceauxSurlignes("rien à surligner", [])).toEqual([
      { texte: "rien à surligner", surligne: false },
    ]);
  });
});
