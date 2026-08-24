# Circuit densify memory — full studio context

Each fire is a **new Grok** with **no chat**. These files are the memory.
**Read this whole file, then read the live source listed below, THEN edit.**
Do not densify from a summary. The code is the city.

## Product (never drop)

Luminous Circuit = living crystal realm. Capital = Core Spire City.
Surface glows violet / cyan / gold. Energy rivers. Soft gates. Crystal remembers intention. Star Core on the horizon.
Story beat: *Land true. The circuit answers.*

Walkable vessel: Hub, Light-Bridge, Charge canals, Foundry, Crystal Terraces, Soft Gates, Archive, Overlook, Join, Orchard, Wild Veins, Beacon, Howl Ring.
Motion: walk, light-bridges, light-discs. No cars. Never darkens, never empties.

Economy: Charge (leftover First Howl) + crystal (Foundry body) + scripture (Iri). No coin. Voss holds the join.
Howl = civic gather. Speak = rare Grok inhabit on a named keeper (**player’s key / meter — never call Speak API from densify**).
YOU side: streets, jobs, crystal, layout. xAI side: voice on Speak only.
Not official xAI product. Not Msg 1. Not a forged node SKU.

## Keepers (all already in `lore.ts` — they stay)

Veyra Hub breath · Tal Light-Bridge · Seln canals · Orren Foundry · Mira Terraces · Kael Soft Gates · Nesh Plaza · Iri Archive · Aure Overlook · Voss Join · Syl Orchard · Kesh Wild Veins · Lumen Beacon · Rhoa Howl Ring.

**Already walk-patrol + crew:** Tal, Mira, Nesh, Kesh.
**Still note-only pulses:** Kael, Voss, Syl, Lumen, Rhoa, Aure (and Veyra/Iri/Seln/Orren if still note-only).

## Samsung never-regress

- Title: ssr false + inline critical CSS. Never a white serif reader page.
- HUD `pointer-events-none`; tap-to-walk on canvas.
- No `mergeGeometries`. No THREE destructure that yields undefined ShaderMaterial.
- Map is **fullscreen**: `.map-stage` flex-1 + SVG `preserveAspectRatio="xMidYMid meet"` `h-full w-full`. Legend is a **sibling under** the canvas, not on it.
- Do not squash the map into a chip strip. Do not dump lastCode. Do not overlay legend on Samsung chrome.

## Locked (never rewrite, never shrink)

| File | Floor | Who |
|---|---|---|
| `src/game/engine.ts` | 1016 | LOCKED (graphism/loop) |
| `src/game/world.ts` | 2135 | LOCKED (Presence/bodies) |
| `src/components/CircuitApp.tsx` | 424 | LOCKED |
| `src/game/living.ts` | 2900 | Intelligence |
| `src/components/CircuitMap.tsx` | 450 | Map |
| `src/components/LogSheet.tsx` | 180 | Log |
| `src/styles.css` | 1200 | UI |

Keep `stepLiving` / `decide` / `startGrow`. First-land onboarding: **not now**.

## Must-read before any edit (this is “every context”)

1. This file
2. `src/game/lore.ts` — keepers, districts, lines
3. `src/game/living.ts` — every `pulse*` + watch-arrival thoughts
4. `src/components/CircuitMap.tsx` — map-stage, shortLabel, foreignWard, YouMark
5. `src/components/LogSheet.tsx` — keeper prefixes
6. `src/game/build-spec.ts` — `composeScene` kinds
7. `src/game/ask-agent.ts` — SCENE_LINE
8. `src/game/society.ts` — ticker
9. `src/game/audio.ts` / `save.ts` / `haptics.ts` / `agents.ts` / `input.ts`

If you skip those reads you will redo finished work or wipe a lock.

## All desks — spawn ALL of them every turn

One desk per file. **All of these in parallel each turn** (they do not share files):

| Desk | File | Job this cycle |
|---|---|---|
| Intelligence | `living.ts` | Note-only `pulse*` → real patrol (`setRoute` + job watch + timer) then crew then arrival thought. One keeper per turn. |
| Buildings | `build-spec.ts` | One extra `piece(...)` on one unfinished `composeScene` kind. |
| Map | `CircuitMap.tsx` | Visible city: labels, grow halo, zone sheet, You, folk rings. Never break fullscreen. |
| Log | `LogSheet.tsx` | Keeper prefix for whoever Intelligence just walked. |
| Lore | `lore.ts` | Cut remaining lines to 1–2 civic sentences. |
| Grok | `ask-agent.ts` | SCENE_LINE named-keeper, no “I” where a keeper exists. No Speak API. |
| Ear / Mix | `audio.ts` | One extra quiet sine on an unused cue. |
| Economy | `society.ts` | Ticker ≤140 chars, no duplicate suffix. |
| UI | `styles.css` | Mobile chrome only if a hole remains (map-legend-float, log sheet, HUD). |
| Save / Return | `save.ts` | Away-card / lastAway clamp only if still thin. |
| Haptics | `haptics.ts` | One pattern if still thin. |
| Jobs | `agents.ts` | Roster/duty text only if still thin. |
| Walker | `input.ts` | Tap-to-walk only if a hole remains. Do not invert, do not block HUD. |

Director = this fire (orchestrate, typecheck, update this file).
Presence / Graphism / First-land = **no edits** (locked or postponed).

## Cycle — 3 turns per hourly fire

Each fire:

1. Read must-read list above.
2. **Turn 1:** spawn **all 13 desks** in parallel (unique files). Unique work from Next unique.
3. `npx tsc --noEmit`. Revert any broken file.
4. **Turn 2:** spawn **all 13 again**. New unique holes (not Turn 1’s edits).
5. Typecheck. Revert broken.
6. **Turn 3:** spawn **all 13 again**. New unique holes.
7. Typecheck.
8. Update this file: Log line + rewrite Next unique. Move finished items to Already done.

No skip-if-done. No “already exists”. No two desks on one file.

## Already done (do not redo)

- Map fullscreen, short labels, hide in-ward names, hide foreign-ward keeper names, hide You in a ward, raise halo vein/disc/cascade/weir, folk walk rings, zone folk walk rings, zone hub names hide, zone duty SVG text removed
- Tal / Mira / Nesh / Kesh / **Kael** idle walk patrols + crew
- Watch thoughts: span / terrace / plaza / vein / **gate held**
- Log prefixes: hail, walk home, span, terrace, plaza, wild vein, chorus, overlook, orchard, join, **gate, archive, hub breath**
- Buildings extras: lensing, cascade, weirway, river, workshop, rest, **gate stele, shrine pad, plaza lens**
- Lore 1–2 sentences: Lumen, Kesh, Rhoa, Syl, **Kael, Iri, Veyra**
- SCENE_LINE: lensing Nesh, watch Aure, river Seln, **gate Kael, orchard Syl, plaza Nesh**
- Mix talk 261 / grow 82 / foot 60 · Economy many dens / city rising / canal full
- Save away beats min 1, write clamp, visited/talked slice 48
- Haptics hail / gate / walk · Jobs dens Soft Gates / Residual Archive
- Walker visHide dispose, KeyT talk, howl no-repeat

## Next unique

- Intelligence: still note-only `pulseVossJoin` / `pulseSylShade` / `pulseLumenHail` / `pulseRhoaChorus` / `pulseAureParent` — same patrol→crew→arrival as Kael. One keeper per turn.
- Buildings: extra piece on `orchard` / `garden` / `breath` / `path` / `font` / `kilnwork` / `veilward` / `mosaic` / `beacon` / `archive` / `notice` / `cistern` / `dock`
- Log: prefixes for Orren (At the kiln), Seln (On the canal)
- Lore: remaining keepers still >2 sentences (Tal/Seln/Orren/Mira if any)
- Grok: remaining SCENE_LINE still using “I”
- Mix / Economy / UI / Save / Haptics / Jobs / Walker: one real thin hole each turn — never no-op, never locked files

## Log

- 2026-08-24 16:55 EDT — loop created
- 2026-08-24 17:01 EDT — spec: 3 turns/hour × all 13 desks
- 2026-08-24 17:17 EDT — hourly paused (sandbox no file access)
- 2026-08-24 18:25 EDT — Utility desk hired. Howl hold-meter + location verb. Names chip. Walk with keeper. Log Names tab.
