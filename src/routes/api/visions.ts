import { createFileRoute } from "@tanstack/react-router";
import { handleVisions } from "@/lib/visions.server";

const handle = ({ request }: { request: Request }) => handleVisions(request);

export const Route = createFileRoute("/api/visions")({
  server: { handlers: { GET: handle, POST: handle } },
});
