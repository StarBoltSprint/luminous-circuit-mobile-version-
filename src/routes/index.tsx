import { createFileRoute } from "@tanstack/react-router";
import { CircuitApp } from "@/components/CircuitApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <CircuitApp />;
}
