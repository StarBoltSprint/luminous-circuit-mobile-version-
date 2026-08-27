const OWNER = "StarBoltSprint";
const REPO = "luminous-circuit-mobile-version-";
const BASE = "main";

export type VisionPayload = {
  id: string;
  author: string;
  wish: string;
  line: string;
  pieces: unknown;
};

async function token(): Promise<string | null> {
  const env = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_PAT;
  if (env && env.trim()) return env.trim();
  try {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const run = promisify(execFile);
    const { stdout } = await run("gh", ["auth", "token"], { timeout: 5000 });
    const t = String(stdout || "").trim();
    return t || null;
  } catch {
    return null;
  }
}

async function gh<T>(path: string, init: RequestInit & { token: string }): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${init.token}`,
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`github ${res.status} ${path}: ${text.slice(0, 240)}`);
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export async function openVisionPullRequest(payload: VisionPayload): Promise<string | null> {
  const tok = await token();
  if (!tok) return null;
  const ref = await gh<{ object: { sha: string } }>(`/repos/${OWNER}/${REPO}/git/ref/heads/${BASE}`, {
    method: "GET",
    token: tok,
  });
  const sha = ref.object.sha;
  const branch = `vision-${payload.id}`;
  try {
    await gh(`/repos/${OWNER}/${REPO}/git/refs`, {
      method: "POST",
      token: tok,
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
    });
  } catch {
    /* branch may exist */
  }
  const file = JSON.stringify(payload, null, 2);
  await gh(`/repos/${OWNER}/${REPO}/contents/visions/${payload.id}.json`, {
    method: "PUT",
    token: tok,
    body: JSON.stringify({
      message: `vision: ${payload.wish.slice(0, 72)}`,
      content: Buffer.from(file, "utf8").toString("base64"),
      branch,
    }),
  });
  const pr = await gh<{ html_url: string }>(`/repos/${OWNER}/${REPO}/pulls`, {
    method: "POST",
    token: tok,
    body: JSON.stringify({
      title: `Vision: ${payload.wish.slice(0, 72)}`,
      head: branch,
      base: BASE,
      draft: true,
      body: `This is a **Circuit vision**. Lore fence: leftover Charge, no Hall, no chrome, no toll.

It does **not** change the live land. Preview it in-game: Menu → **Visions** (ghost crystal and/or graphic tint).

**You (host) decide merge.** Merging this PR writes the law into the repo for the next publish. Accept in-game only grows known crystal on the live stream.

- Author: \`${payload.author}\`
- Wish: ${payload.wish}

\`\`\`json
${file}
\`\`\`
`,
    }),
  });
  return pr.html_url || null;
}

export async function listVisionPullRequests(): Promise<Array<{ id: string; title: string; html_url: string; body: string }>> {
  const tok = await token();
  if (!tok) return [];
  try {
    const pulls = await gh<Array<{ title: string; html_url: string; body: string; head: { ref: string } }>>(
      `/repos/${OWNER}/${REPO}/pulls?state=open&per_page=20`,
      { method: "GET", token: tok },
    );
    return pulls
      .filter((p) => p.head?.ref?.startsWith("vision-") || p.title.startsWith("Vision:"))
      .map((p) => ({
        id: (p.head?.ref || "").replace(/^vision-/, "") || p.html_url,
        title: p.title,
        html_url: p.html_url,
        body: p.body || "",
      }));
  } catch {
    return [];
  }
}

export const VISION_REPO = `https://github.com/${OWNER}/${REPO}`;
export const VISION_PR_LIST = `https://github.com/${OWNER}/${REPO}/pulls`;
