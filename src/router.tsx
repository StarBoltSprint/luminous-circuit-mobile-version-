import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { CircuitApp } from "@/components/CircuitApp";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const raw = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const basepath = raw && raw !== "/" ? raw : undefined;
  return createRouter({
    routeTree,
    basepath,
    defaultErrorComponent: AppErrorComponent,
    notFoundComponent: CircuitApp,
  });
}
