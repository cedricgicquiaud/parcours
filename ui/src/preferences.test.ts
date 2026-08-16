import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLE_EDITION, useEdition } from "./preferences";

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("préférence d'édition (ED-R4)", () => {
  it("est éteinte quand rien n'a jamais été choisi", () => {
    const { result } = renderHook(() => useEdition());
    expect(result.current.edition).toBe(false);
  });

  it("est allumée quand le choix précédent le disait", () => {
    window.localStorage.setItem(CLE_EDITION, "oui");
    const { result } = renderHook(() => useEdition());
    expect(result.current.edition).toBe(true);
  });

  it("traite une valeur inconnue comme éteinte", () => {
    window.localStorage.setItem(CLE_EDITION, "peut-être");
    const { result } = renderHook(() => useEdition());
    expect(result.current.edition).toBe(false);
  });

  it("mémorise la bascule dans les deux sens", () => {
    const { result } = renderHook(() => useEdition());

    act(() => result.current.basculer());
    expect(result.current.edition).toBe(true);
    expect(window.localStorage.getItem(CLE_EDITION)).toBe("oui");

    act(() => result.current.basculer());
    expect(result.current.edition).toBe(false);
    expect(window.localStorage.getItem(CLE_EDITION)).toBe("non");
  });

  it("s'éteint sur commande, sans dépendre de l'état courant", () => {
    window.localStorage.setItem(CLE_EDITION, "oui");
    const { result } = renderHook(() => useEdition());

    act(() => result.current.eteindre());
    expect(result.current.edition).toBe(false);
    expect(window.localStorage.getItem(CLE_EDITION)).toBe("non");
  });
});

describe("stockage indisponible (ED-R5)", () => {
  it("garde l'état en mémoire quand l'écriture est refusée", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("navigation privée");
    });
    const { result } = renderHook(() => useEdition());

    act(() => result.current.basculer());
    expect(result.current.edition).toBe(true);
  });

  it("démarre éteinte quand la lecture est refusée", () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("navigation privée");
    });
    const { result } = renderHook(() => useEdition());
    expect(result.current.edition).toBe(false);
  });
});

describe("aucune sortie réseau (ED-R6)", () => {
  it("ne parle jamais au serveur : c'est une préférence d'affichage", () => {
    const appels = vi.spyOn(globalThis, "fetch");
    const { result } = renderHook(() => useEdition());
    act(() => result.current.basculer());
    expect(appels).not.toHaveBeenCalled();
  });
});
