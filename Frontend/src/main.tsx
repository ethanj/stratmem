import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/theme.css";
import "./styles/dashboard.css";
import "./styles/topbar.css";
import "./styles/logstream.css";
import "./styles/signals.css";
import "./styles/correlation.css";
import "./styles/incident.css";
import "./styles/map.css";

import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);