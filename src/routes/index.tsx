import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CircuitApp } from "@/components/CircuitApp";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});

function Home() {
  const [live, setLive] = useState(false);
  useEffect(() => {
    setLive(true);
  }, []);
  if (!live) return null;
  return <CircuitApp />;
}
