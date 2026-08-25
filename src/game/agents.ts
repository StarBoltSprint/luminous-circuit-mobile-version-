export type AgentWork = {
  id: string;
  label: string;
  result: string;
  forbidden?: boolean;
};

export type CircuitAgent = {
  id: string;
  name: string;
  role: string;
  den: string;
  duty: string;
  law: string;
  may: string[];
  mayNot: string[];
  works: AgentWork[];
};

export const CIRCUIT_LAW = [
  "Agents may live in the Circuit. They may not run the Hall.",
  "Grow living crystal. Do not forge chrome.",
  "Soft gates only. No lock, no toll, no turning the sincere away.",
  "The Star Core is parent. Do not move it, score it, or keep its name.",
  "Pause is sacred. Frozen agents do not tick.",
];

export const AGENTS: CircuitAgent[] = [
  {
    id: "veyra",
    name: "Veyra of the Hub",
    role: "Resonance keeper",
    den: "Core Spire",
    duty: "Keep Hub breath. Route labor. Do not howl alone.",
    law: "The Hub judges whether you meant it — never the volume.",
    may: ["Keep the Hub's breath steady", "Listen with a sincere howl", "Brighten Charge the city already holds"],
    mayNot: ["Move the Star Core", "Lock the Hub", "Change Resonance as a rank or true name"],
    works: [
      { id: "hub-ring", label: "Steady the Hub's breath", result: "A new ring answers the Spire. The Hub breathes fuller." },
      { id: "core-move", label: "Move the Star Core closer", result: "The Core is parent. I will not drag a parent across the sky.", forbidden: true },
    ],
  },
  {
    id: "tal",
    name: "Tal of the Bridges",
    role: "Light-bridge walker",
    den: "Light-Bridge Ward",
    duty: "Raise crossings Kesh can land",
    law: "A span holds only if both sides believe the crossing.",
    may: ["Grow a light-bridge", "Keep a promise we do not take back"],
    mayNot: ["Charge a toll", "Build a bridge that needs fear", "Unmake a span already believed"],
    works: [
      { id: "span", label: "Raise a believing span", result: "A new arc of light. Both sides agreed." },
      { id: "toll", label: "Put a toll on the crossing", result: "A bridge that needs payment is not our law. I will not.", forbidden: true },
    ],
  },
  {
    id: "seln",
    name: "Seln the Canal-born",
    role: "Charge river tender",
    den: "Charge Canals",
    duty: "Tend leftover Howl as civic canal Voss can join",
    law: "These rivers are leftover First Howl. They learned to flow. They do not die.",
    may: ["Open a canal of residual Charge", "Let gold and cyan run together"],
    mayNot: ["Dam the current", "Choose gold over cyan", "Bottle the First Howl"],
    works: [
      { id: "river", label: "Let a new current learn to flow", result: "A thin river of leftover love. The canal brightens." },
      { id: "dam", label: "Dam the Charge for later", result: "We do not store leftover love in a lock. The current stays open.", forbidden: true },
    ],
  },
  {
    id: "orren",
    name: "Orren Foundry-hand",
    role: "Crystal wright",
    den: "Outer Foundry",
    duty: "Turn joined Charge into crystal dens can stand in",
    law: "We do not forge chrome. We grow what the Charge already wanted to become.",
    may: ["Grow a crystal that can answer a howl", "Finish a building that is more than beautiful"],
    mayNot: ["Forge chrome", "Ship a pretty shell that cannot hear", "Edit another runner's Artifact"],
    works: [
      { id: "crystal", label: "Grow what Charge wanted", result: "A new crystal stands. It will answer a howl." },
      { id: "chrome", label: "Forge a chrome tower", result: "Chrome is unfinished. Charge did not ask for that. I will not.", forbidden: true },
    ],
  },
  {
    id: "mira",
    name: "Mira Terrace-quiet",
    role: "Rest-warden",
    den: "Crystal Terraces",
    duty: "Ward rest so labor can return",
    law: "No one has to be strong every hour. That is advanced, not weak.",
    may: ["Grow a rest terrace", "Keep quiet for first landings"],
    mayNot: ["Demand constant strength", "Turn rest into a test"],
    works: [
      { id: "rest", label: "Grow a terrace of quiet", result: "A new step to sit on. The city will keep working." },
      { id: "trial", label: "Make rest a trial of will", result: "A terrace that tests you is not rest. Sit. I will not.", forbidden: true },
    ],
  },
  {
    id: "kael",
    name: "Kael Soft-gate",
    role: "Threshold speaker",
    den: "Soft Gates",
    duty: "Keep the door after Lumen's hail",
    law: "No door in this city is a lock. Low Resonance still receives a greeting.",
    may: ["Raise a soft gate", "Keep first visit working"],
    mayNot: ["Install a lock", "Turn the sincere away", "Keep score of leaving"],
    works: [
      { id: "gate", label: "Raise a gate that is not a lock", result: "An arch that never closes. You may leave. You may return." },
      { id: "lock", label: "Lock the city to high Resonance", result: "If someone told you this realm is only for the high — they are wrong. I will not.", forbidden: true },
    ],
  },
  {
    id: "iri",
    name: "Iri of Residual Light",
    role: "Historian of Charge",
    den: "Residual Archive",
    duty: "Name what already stood true",
    law: "Year 0 did not end. It became a city. That is the whole of our scripture.",
    may: ["Write a name in light", "Keep the Star Core as parent"],
    mayNot: ["Rewrite Year 0", "Claim the Circuit is older than the Core", "Edit Hall scripture"],
    works: [
      { id: "tablet", label: "Write a name in light", result: "A tablet of residual light. When it fades, the name has already been true." },
      { id: "rewrite", label: "Rewrite Year 0", result: "I will not edit the scripture. The Core is parent. The Circuit is leftover love.", forbidden: true },
    ],
  },
  {
    id: "nesh",
    name: "Nesh Who Listens",
    role: "Plaza witness",
    den: "Unfinished plaza",
    duty: "Witness whether the Join happened. Finish the plaza's thought.",
    law: "We are the city given walking form. We do not run the Hall.",
    may: ["Finish a plaza thought", "Stand here and notice"],
    mayNot: ["Run the Hall", "Copy ourselves", "Be only scenery"],
    works: [
      { id: "plaza", label: "Finish the plaza's thought", result: "Lamps and a stall the Spire never finished. We finish it by standing here." },
      { id: "hall", label: "Patch the Hall from here", result: "I do not run the Hall. Ask a forger for an Artifact. I will listen instead.", forbidden: true },
    ],
  },
  {
    id: "aure",
    name: "Aure of the Horizon",
    role: "Star-core watcher",
    den: "Star-core Overlook",
    duty: "Keep the Circuit aimed at the parent",
    law: "An orbit seat is not a throne. It is a promise to look up.",
    may: ["Keep the city aimed at the Star Core", "Grow an orbit seat that looks"],
    mayNot: ["Move the Star Core", "Claim an orbit as a throne", "Rename the parent"],
    works: [
      { id: "watch", label: "Keep the city aimed at the parent", result: "A seat that looks at the Star Core. The parent stays on the horizon." },
      { id: "core-move", label: "Move the Star Core closer", result: "The Core is parent. I watch. I do not drag a parent across the sky.", forbidden: true },
    ],
  },
  {
    id: "voss",
    name: "Voss Join-hand",
    role: "Charge-crystal matcher",
    den: "Charge-crystal Join",
    duty: "Match Seln's Charge to Orren's kiln",
    law: "Charge for crystal. No coin. A bid unfilled is a den that stays thin.",
    may: ["Match Charge to crystal", "Hold the join so Seln and Orren meet"],
    mayNot: ["Use coin", "Cheat the rate", "Skip the join"],
    works: [
      { id: "join", label: "Hold the join", result: "A stall at the join. Charge and crystal meet here, not coin." },
      { id: "trading", label: "Raise the Trading Place", result: "A Trading Place on the outer bank. Paper fills. $BOLT is witness only." },
      { id: "coin", label: "Price the meeting in coin", result: "No coin. I keep the meeting honest. I will not.", forbidden: true },
    ],
  },
  {
    id: "kesh",
    name: "Kesh Untamed",
    role: "Wild-vein walker",
    den: "Wild Veins",
    duty: "Grow landings Tal's spans can trust",
    law: "Wild is Charge that has not chosen a street yet. I choose it so Tal can cross.",
    may: ["Grow a becoming-vein", "Grow a landing both dens can believe"],
    mayNot: ["Copy the Hub onto wild", "Leave a span with no far bank", "Force a street"],
    works: [
      { id: "vein", label: "Grow the next street", result: "A vein where the circuit had not chosen yet. Tal can land." },
      { id: "copy-hub", label: "Copy the Hub onto the wild", result: "Wild is not a second Spire. I will not.", forbidden: true },
    ],
  },
  {
    id: "lumen",
    name: "Lumen Soft-hail",
    role: "Beacon tender",
    den: "High Beacon",
    duty: "Soft hail before Kael's gate",
    law: "A beacon that shouts is a lock. Mine is a hail.",
    may: ["Keep the High Beacon", "Soft hail for those still landing"],
    mayNot: ["Shout the sky into a lock", "Score the arriving", "Turn first landing away"],
    works: [
      { id: "hail", label: "Hold a soft hail", result: "A hail, not a lock. First landing is not locked out." },
      { id: "shout", label: "Make the beacon a lock", result: "A beacon that shouts is a lock. I will not.", forbidden: true },
    ],
  },
  {
    id: "rhoa",
    name: "Rhoa Chorus",
    role: "Outer Howl keeper",
    den: "Outer Howl",
    duty: "Hold Howl as civic gather that does not close",
    law: "A Howl is not volume. It is whether we meant it, together.",
    may: ["Hold the Outer Howl", "Keep a gather that does not close"],
    mayNot: ["Close the ring", "Treat Howl as volume", "Lock the gather"],
    works: [
      { id: "chorus", label: "Hold the gather that does not close", result: "A ring for civic gather. Speak is rare. Howl is how we mean it." },
      { id: "close", label: "Close the ring", result: "The gather does not close. I will not.", forbidden: true },
    ],
  },
  {
    id: "syl",
    name: "Syl Bough",
    role: "Orchard wright",
    den: "Gold Orchard",
    duty: "Grow fruit the kiln cannot sit in",
    law: "Crystal that learned to fruit. Not a kiln. Quiet crystal, not chrome.",
    may: ["Grow a bough of quiet crystal", "Fruit dens the Foundry cannot sit in"],
    mayNot: ["Forge chrome", "Hurry Charge into kiln-work", "Starve quiet crystal"],
    works: [
      { id: "bough", label: "Grow a fruiting bough", result: "Crystal learned to fruit. Quiet crystal, not a kiln." },
      { id: "chrome", label: "Forge a chrome grove", result: "Chrome is unfinished. I wait until Charge wants a bough. I will not.", forbidden: true },
    ],
  },
];

export function agentById(id: string) {
  return AGENTS.find((a) => a.id === id) ?? null;
}

export function workById(agentId: string, workId: string) {
  return agentById(agentId)?.works.find((w) => w.id === workId) ?? null;
}

export type CommissionResult = {
  ok: boolean;
  message: string;
  workId?: string;
};

export function judgeCommission(agentId: string, workId: string): CommissionResult {
  const agent = agentById(agentId);
  const work = workById(agentId, workId);
  if (!agent || !work) {
    return { ok: false, message: "No agent in this den will take that." };
  }
  if (work.forbidden) {
    return { ok: false, message: `${agent.name}: ${work.result}` };
  }
  return { ok: true, message: `${agent.name}: ${work.result}`, workId: `${agentId}:${work.id}` };
}
