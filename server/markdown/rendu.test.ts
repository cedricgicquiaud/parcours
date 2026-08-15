import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MoteurRendu, type ContexteRendu } from "./rendu";

let moteur: MoteurRendu;
let dossier: string;
let contexte: ContexteRendu;

beforeAll(async () => {
  moteur = await MoteurRendu.creer();
  dossier = await fs.mkdtemp(path.join(os.tmpdir(), "parcours-rendu-"));
  await fs.mkdir(path.join(dossier, "assets"), { recursive: true });
  await fs.writeFile(path.join(dossier, "assets", "schema.png"), "png", "utf8");
  contexte = {
    formationId: "formation-claude",
    dossier,
    idsLecons: new Set(["installer", "les-hooks"]),
  };
}, 30_000);

afterAll(async () => {
  await fs.rm(dossier, { recursive: true, force: true });
});

const rendre = (markdown: string) => moteur.rendre(markdown, contexte);

/** Balises que le pipeline a le droit de produire (F-R6). */
const BALISES_AUTORISEES = new Set([
  "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "blockquote", "pre", "code",
  "table", "thead", "tbody", "tr", "th", "td",
  "a", "img", "details", "summary", "div", "span", "section",
  "strong", "em", "s", "del", "hr", "br", "input", "i",
  "figure", "figcaption", "mark",
]);

function balisesEtAttributs(html: string) {
  const balises = new Set<string>();
  const attributs = new Set<string>();
  for (const balise of html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g)) {
    balises.add(balise[1]!.toLowerCase());
    for (const attribut of (balise[2] ?? "").matchAll(/\s([a-zA-Z-]+)\s*=/g)) {
      attributs.add(attribut[1]!.toLowerCase());
    }
  }
  return { balises, attributs };
}

describe("HTML brut inerte (F-R6)", () => {
  const injections = [
    "<script>alert(1)</script>",
    '<img src=x onerror="alert(1)">',
    '<iframe src="https://evil.example"></iframe>',
    "<style>body{display:none}</style>",
    '<div onclick="alert(1)">clic</div>',
    "<svg/onload=alert(1)>",
    '<a href="javascript:alert(1)">lien</a>',
    "<object data=evil></object>",
    '<a href="vbscript:msgbox(1)">lien</a>',
    "<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>",
  ];

  it.each(injections)("n\'émet aucune balise interdite pour %s", (injection) => {
    const { balises, attributs } = balisesEtAttributs(rendre(injection));
    for (const balise of balises) {
      expect(BALISES_AUTORISEES.has(balise), `balise interdite : ${balise}`).toBe(true);
    }
    for (const attribut of attributs) {
      expect(attribut.startsWith("on"), `attribut interdit : ${attribut}`).toBe(false);
    }
  });

  it("échappe le HTML d\'auteur au lieu de l\'interpréter", () => {
    expect(rendre("<script>alert(1)</script>")).toContain("&lt;script&gt;");
  });

  it("refuse un lien javascript: en gardant le texte", () => {
    const html = rendre("[clique ici](javascript:alert)");
    expect(html).toContain("clique ici");
    expect(html).not.toContain("<a ");
  });

  it("refuse un lien data: et un lien protocol-relative", () => {
    expect(rendre("[a](data:text/html;base64,PHNjcmlwdD4=)")).not.toContain("<a ");
    expect(rendre("[a](//evil.example/x)")).not.toContain("<a ");
  });

  it("refuse un schéma masqué par des caractères de contrôle", () => {
    expect(rendre("[a](java\u0000script:alert)")).not.toContain("<a ");
    expect(rendre("[a](java\tscript:alert)")).not.toContain("<a ");
  });
});

describe("liens (F-R12)", () => {
  it("ouvre les liens externes dans un nouvel onglet", () => {
    const html = rendre("[Academy](https://anthropic.skilljar.com)");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("route un lien lecon: existant vers la leçon de la formation", () => {
    const html = rendre("[Voir](lecon:les-hooks)");
    expect(html).toContain('href="/formation/formation-claude/lecon/les-hooks"');
  });

  it("rend un lecon: inexistant en texte simple non cliquable", () => {
    const html = rendre("[Voir](lecon:jamais-vue)");
    expect(html).toContain("Voir");
    expect(html).not.toContain("<a ");
  });
});

describe("images (F-R8)", () => {
  it("sert une image existante par la route assets", () => {
    const html = rendre("![Schéma](assets/schema.png)");
    expect(html).toContain(
      'src="/api/formations/formation-claude/assets/assets/schema.png"',
    );
    expect(html).toContain('alt="Schéma"');
  });

  it("remplace une image manquante par son texte alternatif", () => {
    const html = rendre("![Le schéma promis](assets/absent.png)");
    expect(html).toContain("Le schéma promis");
    expect(html).not.toContain("<img");
  });

  it("refuse une image hors formation", () => {
    const html = rendre("![Fuite](../../etc/passwd)");
    expect(html).not.toContain("<img");
  });
});

describe("conteneurs (F-R7, F-R13, U-R4)", () => {
  it("replie indice et solution dans un details sans open", () => {
    const html = rendre(":::indice La direction\nUn indice.\n:::");
    expect(html).toContain('<details class="repliable repliable-indice">');
    expect(html).not.toMatch(/<details[^>]*\sopen/);
    expect(html).toContain("Indice 1 — La direction");
  });

  it("numérote automatiquement les indices sans titre", () => {
    const html = rendre(":::indice\nUn.\n:::\n\n:::indice\nDeux.\n:::");
    expect(html).toContain("Indice 1");
    expect(html).toContain("Indice 2");
  });

  it("rend astuce et attention en encadrés ouverts", () => {
    const html = rendre(":::astuce\nCommencez petit.\n:::");
    expect(html).toContain('class="encadre encadre-astuce"');
    expect(html).toContain("ASTUCE");
    expect(html).toContain("Commencez petit.");
  });

  it("accepte les alias anglais (F-R13)", () => {
    expect(rendre(":::tip\nx\n:::")).toContain("encadre-astuce");
    expect(rendre(":::warning\nx\n:::")).toContain("encadre-attention");
    expect(rendre(":::danger\nx\n:::")).toContain("encadre-attention");
    expect(rendre(":::hint\nx\n:::")).toContain("repliable-indice");
  });

  it("compare le type sans tenir compte de la casse ni des accents", () => {
    expect(rendre(":::Astuce\nx\n:::")).toContain("encadre-astuce");
    expect(rendre(":::Prérequis\n[Cours](https://exemple.test)\n:::")).toContain(
      "encadre-prerequis",
    );
  });

  it("dégrade un type inconnu sans laisser de ::: visible", () => {
    const html = rendre(":::note\nUn paragraphe.\n:::");
    expect(html).toContain("Un paragraphe.");
    expect(html).not.toContain(":::");
    expect(html).not.toContain("encadre");
  });

  it("accepte du markdown complet imbriqué", () => {
    const html = rendre(
      ":::solution\nPremier paragraphe.\n\n```json\n{ \"a\": 1 }\n```\n\nSecond paragraphe.\n:::",
    );
    expect(html).toContain("Premier paragraphe.");
    expect(html).toContain("Second paragraphe.");
    expect(html).toContain("<pre");
  });

  it("ne casse pas sur un conteneur non fermé", () => {
    const html = rendre(":::indice\nLa suite du fichier.\n\nEncore du texte.");
    expect(html).toContain("La suite du fichier.");
    expect(html).toContain("Encore du texte.");
    expect(html).toContain("<details");
  });

  it("ignore un ::: à l'intérieur d'un bloc de code", () => {
    const html = rendre(":::astuce\n```\n:::\n```\nAprès.\n:::");
    expect(html).toContain("Après.");
    expect(html).toContain("encadre-astuce");
  });
});

describe("code (F-R9, F-R10)", () => {
  it("colore un langage connu", () => {
    const html = rendre("```typescript\nconst a = 1;\n```");
    expect(html).toContain("<pre");
    expect(html).toContain("shiki");
  });

  it("rend un langage inconnu en monospace neutre", () => {
    const html = rendre("```klingon\nnuqneH\n```");
    expect(html).toContain('class="code-neutre"');
    expect(html).toContain("nuqneH");
  });

  it("transmet un schéma mermaid en texte source", () => {
    const html = rendre("```mermaid\ngraph TD;\nA-->B;\n```");
    expect(html).toContain('class="mermaid-source"');
    expect(html).toContain("graph TD;");
  });
});

describe("markdown standard (F-R6, F-R14, U-R7)", () => {
  it("rend les tables GFM dans un conteneur défilant", () => {
    const html = rendre("| a | b |\n|---|---|\n| 1 | 2 |");
    expect(html).toContain('<div class="table-defilante"><table>');
  });

  it("rend les cases à cocher désactivées", () => {
    const html = rendre("- [x] fait\n- [ ] à faire");
    expect(html).toContain("<input type=\"checkbox\" disabled checked>");
    expect(html).toContain("<input type=\"checkbox\" disabled>");
  });

  it("descend les titres d'un niveau pour garder un seul h1", () => {
    const html = rendre("# Titre\n\n## Sous-titre");
    expect(html).toContain("<h2>Titre</h2>");
    expect(html).toContain("<h3>Sous-titre</h3>");
    expect(html).not.toContain("<h1>");
  });

  it("ne donne aucun statut particulier à un bloc --- en tête (F-R14)", () => {
    const html = rendre("---\ntitre: Piège\n---\n\nDu contenu.");
    expect(html).toContain("titre: Piège");
    expect(html).toContain("Du contenu.");
  });
});

describe("performance du rendu (A-R5)", () => {
  it("rend une leçon de 50 Ko en moins de 100 ms", () => {
    const bloc = "## Section\n\nUn paragraphe de démonstration.\n\n```typescript\nconst a = 1;\n```\n\n";
    const markdown = bloc.repeat(Math.ceil(50_000 / bloc.length));
    const debut = performance.now();
    rendre(markdown);
    expect(performance.now() - debut).toBeLessThan(100);
  });
});
