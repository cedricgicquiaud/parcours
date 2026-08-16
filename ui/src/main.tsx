import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Police et icônes vendorées : aucune requête sortante (A-R6).
import "@fontsource/open-sans/400.css";
import "@fontsource/open-sans/500.css";
import "@fontsource/open-sans/600.css";
import "@phosphor-icons/web/regular";
import "./theme.css";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Élément #root introuvable");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
