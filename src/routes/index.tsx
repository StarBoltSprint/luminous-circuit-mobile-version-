import { createFileRoute } from "@tanstack/react-router";
import { CircuitApp } from "@/components/CircuitApp";

export const Route = createFileRoute("/")({
  ssr: false,
  component: CircuitApp,
});
