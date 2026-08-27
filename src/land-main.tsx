import { createRoot } from "react-dom/client";
import { CircuitApp } from "@/components/CircuitApp";
import { installWebMcp } from "@/game/webmcp";
import "./styles.css";

void installWebMcp();

const el = document.getElementById("app");
if (el) createRoot(el).render(<CircuitApp />);
