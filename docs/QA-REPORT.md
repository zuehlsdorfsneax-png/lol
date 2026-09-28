# Orbitlabor – Critical QA Report (for the programmer)

**Tested build:** commit `bee92f2` on branch `claude/modest-ramanujan-op6um7` – byte-identical to the
published artifact `https://claude.ai/artifact/6LSGL7zXa6P5oVKLWaXXzt` (all 33 hashed asset names
match `npm run build:artifact`).
**Date:** 2026-09-28

## How this was tested

- `npm run typecheck`, `lint`, `format:check`, `test`: all green (186/186 tests).
- Automated browser crawl (Chromium/Playwright) of **60 routes × 4 configurations** (desktop 1400 px /
  phone 390 px × light / dark): console errors, failed requests, horizontal overflow, page titles.
- Manual play sessions with screenshots on **1400×900, 820×1180 (tablet), 390×844 (phone portrait)
  and 844×390 (phone landscape)**: Raketenwerft (builder, sandbox, templates, hangar, launch, ascent,
  orbit, map, Bordcomputer, warp, crash, landing, 3 challenges), Lunas Sternenreise, Missionen, Quiz,
  Simulator, Stabilitätskarte, Lagrange-Labor, chapters.
- Scripted checks with `tsx` against the real game code to confirm suspected logic bugs.
- Full code review of `src/rocket/*` (flight, FlightScreen, Builder, parts, challenges, goals, world,
  sandbox, audio, overlays, computer panel), `src/kids/*`, `src/missions/L1Game.tsx`, Quiz, Sources,
  router/App, SaveStore.

## Legend

| Tag            | Meaning                                                               |
| -------------- | --------------------------------------------------------------------- |
| **S1**         | Critical: breaks gameplay, progression integrity or a whole layout    |
| **S2**         | Major: clearly wrong behaviour, wrong information, or badly broken UX |
| **S3**         | Minor: inconsistency, confusing UI, small visual defect               |
| **S4**         | Polish / nit                                                          |
| **[verified]** | Reproduced in the browser or with a script (evidence given)           |
| **[code]**     | Confirmed by reading the code; not separately reproduced              |

Line numbers refer to commit `bee92f2`.

---

## 0. Fix these first (Top 12)

1. **RW-X01** – Sandbox satellites grant career points (+150 points with one key press).
2. **RW-I01** – Game keys work while paused / during the challenge briefing (Space throws away the stage before the challenge even starts).
3. **RW-L01** – Docking HUD says "Entfernt sich" when you are approaching (sign inverted).
4. **RW-M01** – Rocket game is unusable in phone landscape (navball covers the rocket, buttons overlap).
5. **RW-X02** – Challenge savegames (F5) can be loaded in career mode → free goals.
6. **RW-X04** – "Ohne Bordcomputer" challenges can be solved with the L/T autopilots.
7. **RW-I04** – Shortcuts ignore Ctrl/Cmd: Ctrl+R reloads (flight lost), Ctrl + W (throttle down + throttle up) closes the tab.
8. **RW-L02** – "No crew = no homecoming" is advertised but not implemented.
9. **RW-M02** – Tablet portrait (820 px): action buttons overlap navball and SAS buttons.
10. **RW-I02 / RW-I03** – Help and challenge-result dialogs don't pause the simulation.
11. **QZ-01 / QZ-02** – Quiz covers only 6 of 9 chapters and the correct answer is almost always option 2 or the longest one.
12. **DEP-01 / DEP-04** – Artifact: missing favicon/manifest (404) and "Foto speichern" silently fails in the embedded page.

---

## 1. Deployment / artifact (DEP)

**DEP-01 · S2 · [verified] Favicon and web manifest are missing in the published artifact (HTTP 404).**

- Where: published file list of the artifact (35 files) vs. `dist-artifact/` (37 files); `index.html:11-12`.
- Actual: `icon.svg` and `manifest.webmanifest` were not published. The browser logs
  `Failed to load resource: the server responded with a status of 404` on first load.
- Expected: no 404s; the tab shows the Orbitlabor icon.
- Fix: publish `public/icon.svg` and `public/manifest.webmanifest` with the artifact, or drop the two
  `<link>` tags in `--mode artifact`.

**DEP-02 · S3 · [verified] The artifact page is an HTML document nested inside another HTML document.**

- Actual: the served page is `<!doctype html><html><head>…</head><body><!doctype html><html lang="de"><head>…`.
  The inner `<head>` is discarded by the parser; `meta description`, `theme-color`, `manifest`,
  `icon` end up inside `<body>` (invalid; `theme-color`/`manifest` are ignored there).
- Fix: in artifact mode, emit only the body content (script/link tags + `#app`) so the publishing
  skeleton does not wrap a full document.

**DEP-03 · S3 · [code, needs device check] Possible double safe-area inset on notched phones.**

- The artifact wrapper adds `:root{padding-top:env(safe-area-inset-top)}`; the app itself also uses
  `env(safe-area-inset-top)` for the sticky sidebar (`src/styles/global.css:240`). On an iPhone with
  a notch the offset is likely applied twice. Verify on a real device.

**DEP-04 · S2 · [code] "Foto speichern" (key O / pause menu) fails silently in the artifact.**

- Where: `src/rocket/FlightScreen.tsx:551-563` builds its own `<a download>` click.
- The app has an artifact guard `FILE_EXPORT` (`src/ui/download.ts`) that the Simulator and
  Stabilitätskarte respect (they hide the PNG button). The rocket game bypasses it, and always
  shows the toast "Foto gespeichert." even when the download is blocked.
- Fix: use `downloadCanvas()`, hide the button and ignore O when `!FILE_EXPORT`, toast only on success.

**DEP-05 · S3 · [code] "Vollbild" button gives no feedback when fullscreen is not allowed.**

- Where: `src/rocket/FlightScreen.tsx:1161-1167` swallows the `requestFullscreen` rejection. Inside an
  iframe without `allowfullscreen` nothing happens.
- Fix: hide/disable the button when `!document.fullscreenEnabled`.

---

## 2. Raketenwerft – game logic & physics (RW-L)

**RW-L01 · S1 · [verified] Docking HUD label is inverted: "Entfernt sich" while approaching.**

- Where: `src/rocket/FlightScreen.tsx:1480` (`ti.closing > 0 ? 'Entfernt sich' : 'Kommt näher'`),
  value from `src/rocket/flight.ts:830`.
- `closing = (v_rel · (target − rocket)) / d` is **positive when the rocket approaches**.
- Repro (script): rocket 1 km from the station port, moving toward it at 5 m/s → `closing = +5.00`,
  distance shrinks 1002.5 → 1002.0 m in 0.1 s, HUD shows **"Entfernt sich 5,0 m/s"**.
- Impact: the most important readout during docking tells the player the opposite. Also wrong for
  Moon/planet targets.
- Fix: swap the labels (`closing > 0 ? 'Kommt näher' : 'Entfernt sich'`) and add a test.

**RW-L02 · S1 · [code] "Ohne Menschen an Bord zählt keine Heimkehr" is not implemented.**

- Promise: `src/rocket/parts.ts:84` (Sondenkern info text).
- Actual: `src/rocket/flight.ts:1689-1691` awards `return` (50 P.) and `marsreturn` (150 P.) to any
  rocket, including probe-only rockets ("Sondenkern" + tank + engine).
- Fix: at touchdown require `this.allParts().some(id => part(id).kind === 'capsule')`.

**RW-L03 · S2 · [code] Sandbox "Unzerstörbar" lets you land on the Sun and on Jupiter.**

- Where: `src/rocket/flight.ts:1665` – `(body.solid && …) || this.indestructible`.
- Actual: touching a non-solid body sets `status = 'landed'`, `landedOn = SUN/JUPITER` and prints
  "Gelandet auf: Sonne, mit … m/s. Gut gemacht!".
- Fix: indestructible should only skip speed/tilt limits on solid bodies; on gas bodies keep the
  rocket flying (e.g. clamp to the "surface" and cancel radial velocity) or show a sandbox-specific
  message.

**RW-L04 · S2 · [code] Quicksave does not store heat and several other states (save/load exploit).**

- Where: `src/rocket/flight.ts:487-550` (`snapshot`/`restore`).
- Not saved: `heat`, `angVel`, `warpIndex`, `rcs`, `fine`, `translate`, `visited` (the flight
  report's "Einflussbereiche" list is empty after loading), sandbox rule flags (only re-applied if
  the _current_ flight is sandbox).
- Exploit: F5 at 90 % reentry heat, F9 → heat is 0 %.
- Fix: add the fields, bump snapshot `v` to 3, keep backward compatibility.

**RW-L05 · S2 · [code] One single quicksave slot shared by career and sandbox.**

- Where: `src/rocket/FlightScreen.tsx:220` (`SAVE_KEY` constant).
- Saving in the sandbox overwrites the career savegame without warning (and vice versa).
- Fix: separate slots (career / sandbox) or a small slot list with timestamps; confirm overwrite.

**RW-L06 · S2 · [code] The Hilfe-Pilot has no failure path.**

- Where: `src/rocket/autopilot.ts:50-105` (`OrbitPilot.update`).
- With a rocket that cannot reach orbit (the **default** design "Hüpfer" has 3,151 m/s; the builder
  itself says orbit needs 3,900 m/s) the pilot keeps `throttle = 1` on an empty tank, never arms the
  parachute, and the HUD keeps saying "Der Hilfe-Pilot fliegt in eine Umlaufbahn" while the rocket
  falls back.
- Fix: return `'failed'` with a message ("Δv reicht nicht für eine Umlaufbahn") when the last stage
  is empty and the orbit is not reached; arm the chute; refuse to start when `deltaV()` is clearly
  too small.

**RW-L07 · S2 · [code] Satellite IDs restart at 1 on every page load → duplicate IDs and names.**

- Where: `src/rocket/flight.ts:383` (`let satId = 1`), `:1222-1223` (`name = 'Satellit ' + (count + 1)`).
- Stored satellites from earlier sessions already use IDs 1…n, so new ones collide. The Mission
  Control list uses `key={s.id}` (`src/rocket/Builder.tsx:1096`) → duplicate Preact keys (render
  glitches). After switching one off, the next satellite gets a name that already exists.
- Fix: `id = max(existing ids) + 1` (or a UUID); persistent counter for names.

**RW-L08 · S3 · [code] Staging adds 2 m/s of free Δv each time.**

- Where: `src/rocket/flight.ts:1087-1090` – the rocket gets `+2 m/s` along its axis regardless of
  mass (momentum is not conserved; the dropped stage gets −2 m/s).
- Fix: split the separation impulse by mass ratio or make it tiny.

**RW-L09 · S3 · [code] Parachute debris always looks like the small parachute.**

- Where: `src/rocket/flight.ts:1134` – `parts: ['fallschirm']` even when a `fallschirm-xl` was cut.

**RW-L10 · S3 · [code] Dropped stages only feel Earth's atmosphere.**

- Where: `src/rocket/flight.ts:2002` – `densityAt(EARTH, …)`; on Mars/Venus debris falls without drag.

**RW-L11 · S3 · [code] Burn-time / Δv maths ignore sandbox rules.**

- `burnTime()` (`src/rocket/flight.ts:709-732`) assumes decreasing mass although infinite fuel keeps
  the mass constant → wrong maneuver start times in the sandbox. `activeIsp()`
  (`src/rocket/autopilot.ts:112-124`) ignores `thrustScale`.

**RW-L12 · S3 · [verified] HUD and map disagree about the time to Ap/Pe.**

- Screenshot (150 km circular orbit): HUD "Ap 150 km **00:59**", map label "Ap 150 km · **in 23:30**";
  HUD "Pe … 19:07" vs. map "Pe … in 11:10".
- Cause: HUD uses Kepler elements, the map uses extrema of the numerical prediction; for
  near-circular orbits the apsides are ill-defined.
- Fix: use one source; hide Ap/Pe times (or show "Kreisbahn") when `e < ~0.002`.

**RW-L13 · S4 · [code] Side effects outside the obvious place.**

- `checkDocking()` silently turns a `null` target into `'station'` whenever the rocket passes within
  200 m of it (`src/rocket/flight.ts:1755-1758`).
- `predict()` mutates the real maneuver node (`nd.at`, `refreshNode()`) inside a prediction
  (`src/rocket/flight.ts:2087-2089`).

---

## 3. Raketenwerft – exploits / progression integrity (RW-X)

**RW-X01 · S1 · [verified] Satellites deployed in the sandbox give career goals.**

- Where: `src/rocket/RocketGame.tsx:99-103` (`saveSats` has no sandbox check),
  `src/rocket/FlightScreen.tsx:258` (sandbox _and_ career flights load the stored satellites),
  `:995` (every non-challenge flight persists them), `src/rocket/flight.ts:1235-1244`
  (`satelliteGoals()` counts **all** satellites, including those from earlier flights).
- Repro (script): 3 stored satellites (e.g. from the sandbox: one high around Earth, one around the
  Moon, one around Jupiter) → one career flight deploys **one** satellite in LEO →
  goals `satellite, highsat, moonsat, planetsat` = **25+30+35+60 = 150 points** at once. With two
  more sandbox satellites around Earth also `network` (+40).
- Fix: mark satellites with `sandbox: true` (or keep a separate list); award satellite goals only for
  satellites deployed in the current career flight; do not show sandbox satellites in career.

**RW-X02 · S1 · [code] Challenge savegames can be loaded in career mode.**

- Where: F5 → `quicksave()` (`src/rocket/FlightScreen.tsx:390-400`, key handler `:654`) has **no
  challenge check** (only `quickload` has one, `:408`). Challenge flights have `sandbox = false`, so
  the snapshot looks like a normal career save.
- Repro idea: start "Andocken an Kepler" (starts in orbit 10 km under the station) → F5 → leave →
  start any career flight → F9 → orbit/docking goals for free (also works with "Landung an der
  Mondbasis", "Heimkehr durchs Feuer", Mars challenges).
- Fix: block F5 in challenges (and hide it), or store `challenge: id` in the snapshot and refuse /
  flag it as "no points".

**RW-X03 · S2 · [verified] "Butterweich" (+10 P.) with a 0.1-second throttle tap on the pad.**

- Where: `src/rocket/flight.ts:1681` – `if (speed < 2) this.goal('soft')` with no altitude/flight
  requirement.
- Repro (script): full throttle for 6 frames, then 0 → rocket rises **16 cm**, lands at 1.93 m/s →
  goals: `soft` (without even `lift`).
- Fix: require a real flight (e.g. `maxAltitude` over that body > 100 m, or `lift` reached and
  `liftoff` older than a few seconds).

**RW-X04 · S2 · [verified] Autopilots work in "Ohne Bordcomputer" challenges.**

- Where: key `L` → `toggleLanding()` (`src/rocket/FlightScreen.tsx:631`, `:527-536`), key `T` →
  `togglePilot()` (`:648`, `:493-515`). Neither checks `challenge.computer`; only the buttons are
  hidden.
- Repro: "Selbstmordbremsung" (brief: "Ohne Bordcomputer – hier zählt dein Können"), press L → HUD
  "Lande-Autopilot: freier Fall." and it lands by itself.
- Fix: guard both functions with `!challenge || challenge.computer` and toast why.

---

## 4. Raketenwerft – input & controls (RW-I)

**RW-I01 · S1 · [verified] Game keys (and gamepad buttons) are processed while the game is paused or a dialog is open.**

- Where: `src/rocket/FlightScreen.tsx:609-656` (keydown) and `:877-886` (gamepad edges) never check
  `pausedRef`/`briefing`/`result`/`report`/`help`.
- Repro 1: on the pad press Esc (pause menu), then Z and Space → state `throttle: 1` while paused;
  after Esc the rocket launches immediately.
- Repro 2: open challenge "Heimkehr durchs Feuer"; on the briefing dialog (before "Los geht's!")
  press Space → `segs 2 → 1`, active fuel 0: the engine stage is thrown away before the challenge
  starts, the challenge is lost. Z sets full throttle during the briefing too.
- Fix: while any modal is open only handle Esc/H (and F9 on the crash dialog); ignore everything else.

**RW-I02 · S2 · [verified] The help overlay (H) does not pause the game.**

- Where: `src/rocket/FlightScreen.tsx:337` – `pausedRef = paused || briefing || report` (no `help`).
- Repro: during ascent press H → simulation time advanced 10.7 s → 12.3 s behind the dialog. Opening
  help during a landing burn crashes the rocket.
- Fix: include `help` in `pausedRef`.

**RW-I03 · S2 · [code] The challenge result dialog does not pause either.**

- Same line; `result` is missing. After "Geschafft!" the rocket keeps flying/falling behind the
  dialog; alarm sounds keep playing; a crash behind a success dialog is possible.

**RW-I04 · S1 · [code] Shortcuts ignore Ctrl/Cmd/Alt; Ctrl is even used as a game key.**

- Where: `src/rocket/FlightScreen.tsx:576-608`, `:613-655`.
- Ctrl+R / Cmd+R: toggles RCS **and reloads the page** → flight lost.
- Ctrl+P: toggles the parachute and opens the print dialog. Ctrl+F: fine control + find bar.
- Ctrl is "throttle down", W is "throttle up": pressing **Ctrl + W closes the browser tab** (this
  cannot be prevented with `preventDefault`).
- Fix: `if (e.ctrlKey || e.metaKey || e.altKey) return;` at the top, remove Ctrl as throttle key
  (also from `RocketPage.tsx:31` and the in-game help).

**RW-I05 · S2 · [code] Browser Back / Android back gesture / reload silently destroy the running flight.**

- The game is a full-screen overlay without its own history entry and without `beforeunload`.
  Back navigates to the previous page and unmounts the game.
- Fix: push a history state when the game opens (Back = leave game, with confirmation while
  flying); `beforeunload` warning during an unsaved flight.

**RW-I06 · S3 · [code] Destructive actions without confirmation.**

- Pause menu "Neustart" and "Zur Werft" (`src/rocket/FlightScreen.tsx:1770-1777`, `:1819`) end a
  possibly hour-long Mars mission with one click.

**RW-I07 · S3 · [code] Pressing Shift stops the autopilot.**

- `'shift'` is in the `steer` set (`src/rocket/FlightScreen.tsx:595-620`), so typing "?" (Shift+ß on
  German keyboards) to open help cancels a running maneuver.

**RW-I08 · S3 · [code] Throttle is not keyboard/AT operable.**

- `role="slider"` without `tabIndex`, `onKeyDown` (`src/rocket/FlightScreen.tsx:1968-1984`).

**RW-I09 · S4 · [code] Builder: Delete/Backspace are global.**

- `src/rocket/Builder.tsx:528-536`: Backspace with focus on any button (e.g. inside an open menu)
  deletes the selected part.

**RW-I10 · S4 · [code] Any tap on empty sky turns the rocket (SAS "point").**

- `src/rocket/FlightScreen.tsx:798-807`. On phones a slightly missed HUD button tap re-orients the
  rocket and switches off the autopilot. Consider long-press or a minimum hold time.

---

## 5. Raketenwerft – HUD, map and flight screen (RW-H)

**RW-H01 · S2 · [verified] The "Zeitsprung" menu is partly hidden behind the tip text and the window pill.**

- Screenshot in orbit: the entries "Zum Ap (höchster Punkt)" and "Zum Pe (tiefster Punkt)" are
  covered by "Umlaufbahn geschafft! Wähle rechts ein Ziel…" and "Startfenster Mars …".
- Fix: `.warp-menu` needs a higher `z-index` than `.hud-msg` / `.hud-pills`.

**RW-H02 · S2 · [verified] Goal toasts cover the middle of the screen for up to 13.5 s.**

- Up to three large toasts stack in the centre over the rocket, the orbit and the maneuver node;
  they disappear one by one every 4.5 s (`src/rocket/FlightScreen.tsx:1133-1137`). On phone
  landscape they are drawn under the navball.
- Fix: corner position, compact, dismiss together, click-to-dismiss.

**RW-H03 · S2 · [verified] Map labels collide.**

- "Nächste Annäherung an Mars: 14,72 Mio. km" is drawn over the tip text (Earth view) and over the
  "Erde" label (Sun view); "Hill-Sphäre des Mondes" is hidden behind a toast; "Aufschlag: Erde"
  hides the rocket marker.
- Fix: simple label collision avoidance / leader lines; keep labels out of HUD zones.

**RW-H04 · S2 · [verified] On single-stage rockets the biggest button says "SCHIRM scharf machen" – on the pad and during the ascent.**

- The primary orange action before launch invites arming the parachute. The actual launch actions
  ("Countdown", "Vollgas") are small.
- Fix: before liftoff make the big button "Start" (countdown/full throttle); show the parachute as a
  secondary button.

**RW-H05 · S2 · [verified] Tip promises an orbit the rocket cannot reach.**

- Pad tip: "Der Hilfe-Pilot (T) fliegt bis in die Umlaufbahn" (`src/rocket/FlightScreen.tsx:159`)
  also for the default "Hüpfer" (3,151 m/s < 3,900 m/s). See RW-L06.

**RW-H06 · S3 · [verified] Pad telemetry: clock runs before liftoff, "Pe im Boden" in alarm red.**

- "T+ 00:01" counts on the launch pad; "Pe im Boden" is red while simply standing on the ground.
- Fix: "T– …"/"00:00" until liftoff; neutral colour when landed.

**RW-H07 · S3 · [verified] Zeitsprung "+1 h / +6 h / +24 h" is offered during a powered suborbital ascent.**

- Choosing it sets `throttle = 0` (`src/rocket/FlightScreen.tsx:565-572`) → the rocket falls back.
- Fix: offer hour jumps only when landed, docked or in a stable orbit.

**RW-H08 · S3 · [verified] Bordcomputer offers pointless plans.**

- At 1 km altitude under full thrust it offers "⬇ Automatisch landen auf Erde".
- In a perfectly circular orbit it offers "Kreisbahn am Ap" and "Kreisbahn am Pe".
- Fix: filter `planOptions()` by state (ascending/thrusting, eccentricity).

**RW-H09 · S3 · [verified] Semi-transparent HUD panels lose contrast.**

- The launch building (blue/red stripes) and clouds show through the telemetry card ("Pe im Boden"
  sits on a blue stripe). Use a more opaque background or backdrop blur.

**RW-H10 · S3 · [verified] Telemetry footer overflows.**

- "T+ 110 Tage 01:22:39" touches "1,4 g"; with 3–4-digit day counts it overlaps. Use a shorter
  format or two lines.

**RW-H11 · S3 · [code] "Boden in N s" ignores gravity.**

- `impact = altitude / descentSpeed` (`src/rocket/FlightScreen.tsx:2006`); the real time is shorter
  because the rocket accelerates. Use `(-v + √(v² + 2gh)) / g` (already done in `timeToSurface`).

**RW-H12 · S3 · [verified] The space station is an unlabeled blue "+".**

- In the flight view and on the map the station marker has no label; on the Earth map it is often
  under the tip text.

**RW-H13 · S3 · [code] Mute is not remembered.**

- Every flight creates a new `RocketAudio` (`src/rocket/FlightScreen.tsx:319`) with sound on; the
  pause menu button shows the state ("Ton an") instead of the action → ambiguous. Persist the
  setting; label "Ton ausschalten"/"Ton einschalten".

**RW-H14 · S4 · [verified] Double punctuation "Lande-Autopilot: Bremsen!."**

- `src/rocket/FlightScreen.tsx:1196` appends "." after a phase text that ends with "!".

**RW-H15 · S4 · [code] Countdown voice says "Zehn", then nothing for 9–6, then "Fünf … Eins".**

- `src/rocket/FlightScreen.tsx:902`.

**RW-H16 · S4 · [code] Explosion sound clips.**

- `burst(1.8, 500, 1.8)` gain 1.8 > 1 (`src/rocket/audio.ts:148`).

**RW-H17 · S3 · [verified] In-game help table looks unfinished.**

- The whole phrase "W / S oder ↑ / ↓ (auch Umschalt / Strg)" is inside one `<kbd>` key cap and
  wraps; the "⏩" colour emoji is mixed into text; the Bordcomputer uses emoji/Unicode icons
  (⬇ ▶ ■ ⏩) while the rest of the UI uses the SVG icon set; the key "O" (photo) is
  indistinguishable from "0" in the monospace font.

**RW-H18 · S4 · [verified] Rocket is tiny on the pad.**

- At 1400×900 the 9.5 m rocket is ≈45 px next to a tower 4× its height; the player can hardly see
  the rocket they built. Consider a closer default zoom on the pad.

**RW-H19 · S4 · [verified] Stale tip.**

- "Senkrecht steigen. Ab 3 km langsam nach rechts neigen" stays while coasting with the engine off.

**RW-H20 · S4 · [code] Star ratings use `aria-label` on a plain `div` (ignored by screen readers).**

- `src/rocket/Overlays.tsx:67`, `src/rocket/Builder.tsx:1002`. Add `role="img"`.

---

## 6. Raketenwerft – builder / Werft (RW-B)

**RW-B01 · S2 · [code] Parachute warning only knows the small capsule and the small parachute.**

- Where: `src/rocket/parts.ts:753` – `design.includes('kapsel') && !design.includes('fallschirm')`.
- Kapsel + Großer Fallschirm → false warning "Ohne Fallschirm …". Kapsel Aurora without any
  parachute → no warning.
- Fix: check by `kind` (`capsule` present && no part of kind `chute`).

**RW-B02 · S2 · [code] Hangar entries are not validated → one bad entry crashes the game.**

- Where: `src/rocket/Builder.tsx:479-481` loads `rocketHangar` unchecked; `:625` loads it into the
  design; `part()` throws on unknown IDs (`src/rocket/parts.ts:427`). There is no error boundary, so
  the whole screen goes blank. (`loadDesign()` in `RocketGame.tsx:13-17` does validate – the hangar
  does not.)
- Fix: filter hangar designs with `isPart`, drop invalid ones; add an error boundary around the game.

**RW-B03 · S3 · [code] Hangar: silent overwrite, instant delete, false success message.**

- Saving under an existing name overwrites it without asking (`src/rocket/Builder.tsx:652`);
  the trash button deletes immediately (`:633-644`); "„…“ im Hangar gespeichert." is shown even if
  `localStorage` rejected the write (`SaveStore.update` ignores the `save()` result).

**RW-B04 · S3 · [verified] "Abbauen" deletes the whole rocket without confirmation – and there is no undo at all.**

- `src/rocket/Builder.tsx:675-684`. On phones "Abbauen" (delete all) and "Entfernen" (delete part)
  use the **same trash icon** next to each other.
- Fix: undo/redo stack (Ctrl+Z) or at least a confirmation; different icon for "delete all".

**RW-B05 · S3 · [code] Builder numbers ignore the sandbox settings.**

- Δv, TWR, burn times, the "Zu schwer … hebt nicht ab" warning (`src/rocket/parts.ts:741-745`) and
  the milestone list (`src/rocket/Builder.tsx:32-40`) ignore thrust ×2/×5/×10, infinite fuel and the
  chosen start body (e.g. start on the Moon).
- Also only the first heat shield is checked (`src/rocket/parts.ts:760`).

**RW-B06 · S3 · [verified] Template menu is a scroll box cut in the middle of an entry.**

- Desktop and phone: the last visible item is cut ("Satellitennetz", "Selene (Mond)") without a
  fade/scroll hint; entries show no Δv, stage count or which parts are locked (only a "🔒" prefix).

**RW-B07 · S3 · [code] Side boosters cannot be selected by clicking them.**

- Hit test uses `part.width` (`src/rocket/Builder.tsx:248`) but boosters are drawn wider
  (`visualWidth`). The selection frame also uses `width` (`:207`).

**RW-B08 · S3 · [verified] Phone: the part toolbar covers the selected part.**

- Selecting the bottom engine shows the toolbar exactly over the engine; the selection frame is
  hidden.

**RW-B09 · S3 · [verified] Hard-to-read category tabs.**

- "Kapseln Tanks Antrieb Aero Technik" is squeezed into ~11 px text on desktop and tablet.

**RW-B10 · S3 · [code] Unexplained symbols in the stage table.**

- "☾" after the TWR (`src/rocket/Builder.tsx:828`) is never explained; column "Brennt" should read
  "Brenndauer".

**RW-B11 · S4 · [verified] Touch wording on desktop / direction wording on phone.**

- Desktop hint "Tippen fügt unten an." (`src/rocket/Builder.tsx:583`); empty-rocket hint "Wähle
  links ein Bauteil" (`:235`) is wrong on phones where parts are at the bottom.

**RW-B12 · S4 · [code] Sandbox switch tooltip is inaccurate.**

- "Unendlich Treibstoff, alle Teile – dafür keine Punkte" (`src/rocket/Builder.tsx:687`) although
  infinite fuel is a separate switch that can be off.

---

## 7. Raketenwerft – challenges & career (RW-C)

**RW-C01 · S2 · [code] Star conditions are independent but shown as tiers.**

- In "Erster Hüpfer", "Ab in die Umlaufbahn", "Der Bordcomputer", "Andocken an Kepler",
  "Satellitennetz" the 2nd and 3rd star are independent (`stars(true, a, b)` counts conditions,
  `src/rocket/challenges.ts:110, 143, 179, 213, 265`).
- The result dialog says "Für den nächsten Stern: `challenge.stars[result.stars]`"
  (`src/rocket/Overlays.tsx:149`), and the briefing ticks `i < best` (`:95`).
- Example: landing at 3 m/s after only 12 km → 2 stars; the dialog asks for "mit weniger als 4 m/s
  aufgesetzt" (already achieved) instead of "über 40 km"; the briefing then ticks the wrong line.
- Fix: store and display each condition's result separately.

**RW-C02 · S3 · [code] The best challenge result text is saved but never shown.**

- Saved in `src/rocket/RocketGame.tsx:113`; no UI reads it. Show it on the challenge card.

**RW-C03 · S3 · [verified] Challenge grid is unbalanced.**

- "Profi" has 5 cards → 4 in a row and "Mars-Gleiter" alone; "Flugschule" leaves an empty slot.
  On phones each card is ~430 px high → ~4,300 px of scrolling.

**RW-C04 · S3 · Challenge name "Selbstmordbremsung".**

- `src/rocket/challenges.ts:310`. Literal translation of "suicide burn" in an app for school
  students ("auch für Jüngere"). Suggest "Bremsen in letzter Sekunde" or "Hoverslam".

**RW-C05 · S3 · [verified] Career screen issues.**

- Goal descriptions exist only as `title` tooltips (`src/rocket/Builder.tsx:1079`) → invisible on
  touch devices.
- 4-column grid: "Planeten" is tall, "Können" short, the right half of row 2 is empty.
- Paint chip "Sonnenwind" wraps alone to a second line; locked paints show a bare number
  ("🔒 Arktis · 300") – add "Punkte".

**RW-C06 · S3 · [code] No way to reset progress.**

- There is no UI to reset career points, stars, satellites, hangar, missions or quiz
  (`SaveStore.clear()` exists but is unused).

**RW-C07 · S3 · [code] Satellites can be switched off without confirmation.**

- `src/rocket/Builder.tsx:1103`.

---

## 8. Raketenwerft – phone, tablet, landscape (RW-M)

**RW-M01 · S1 · [verified] Phone landscape (844×390) is unusable.**

- Pad: the navball is drawn **on top of the rocket and the tower**; "Countdown/Hilfe-Pilot/
  Fallschirm/RCS" overlap the navball; the RCS button covers the SAS buttons ◆ and ✦; the zoom
  buttons are hidden behind the engine panel; the Δv box overlaps the target card.
- Map: three toasts under the navball, "Nächste Annäherung …" clipped behind the tip, scale bar
  over the telemetry.
- Fix: a dedicated landscape layout (`@container (max-height: 480px)`), e.g. navball bottom-left,
  actions in a column left of the throttle, tip hidden.

**RW-M02 · S2 · [verified] Tablet portrait (820×1180): action buttons overlap the navball and the SAS row.**

- "Fallschirm P" and "RCS R" cover the pitch readout and the last SAS buttons.

**RW-M03 · S2 · [verified] Phone help overlay shows descriptions without keys.**

- `.game kbd { display:none }` inside `@container stage (max-width: 640px)` (`src/rocket/game.css`)
  hides every key name: an empty 40 % column plus sentences like "Nächste Stufe" with no way to
  know how. Show touch controls on phones instead.

**RW-M04 · S2 · [verified] Phone: icon-only buttons without accessible names.**

- `.blueprint-tools .gbtn-label` and `.game-tabs .gbtn-label` are `display:none` on phones
  (`src/rocket/game.css:2506-2513`). "Vorlagen", "Hangar", "Einstellungen" (Menu buttons,
  `src/rocket/Builder.tsx:294-303`, no `aria-label`) and the inactive tabs "Herausforderungen" /
  "Karriere" have **no accessible name** and no visible label. Icons (stack, house, trophy, medal)
  are not self-explanatory.
- Fix: `aria-label`s; visible labels under the icons.

**RW-M05 · S2 · [verified] Phone: no target selector in the HUD, but the tip says "Wähle rechts ein Ziel".**

- `.hud-tr .hselect-wrap { display:none }` (`src/rocket/game.css:2647`); tip in
  `src/rocket/FlightScreen.tsx:217`. The target can only be chosen in the Bordcomputer, which is
  not available in "no computer" challenges.

**RW-M06 · S3 · [verified] Phone tips reference keyboard keys.**

- "(W / ↑, Z = Vollgas) – oder „Countdown“ (C)", "Taste 3", "(P)", "(B)" on touch devices.

**RW-M07 · S3 · [verified] Phone target card wraps units.**

- "35.447 / km", "2.022 / m/s" split over two lines each.

**RW-M08 · S3 · [code] Tap targets too small on phones.**

- SAS buttons 24×24 px, RCS pad 30×30 px (`src/rocket/game.css`, phone section) – below 44 px.

**RW-M09 · S3 · [verified] Phone map is overloaded.**

- Telemetry card, target card, window pill, toast and several labels overlap the orbit.

**RW-M10 · S3 · [verified] Phone Bordcomputer sheet covers throttle, stage button and navball.**

- Half the screen, no drag handle, no control while it is open.

**RW-M11 · S3 · [verified] Rocket landing page on phones.**

- Doc tabs clipped ("Physik im S…") with no scroll hint; "Spielen" and "Herausforderungen" buttons
  have different widths.

---

## 9. Raketenwerft – texts & German language (RW-T)

**RW-T01 · S2 · [verified] Wrong case after "in": "in 181 Tage 05:08:06".**

- `clock()` returns "Tage"; after "in" German needs dative "Tagen": HUD pill
  (`src/rocket/FlightScreen.tsx:1406`), Bordcomputer "Das Startfenster … öffnet sich in 181 Tage …"
  (`src/rocket/planner.ts:393`), map labels (`src/rocket/mapdraw.ts:392, 429, 449, 533`), planner texts.
- Fix: `clock(t, { dative: true })` → "in 181 Tagen 05:08:06".

**RW-T02 · S2 · [code] Body names are inserted without articles/case.**

- "Das Startfenster zu Mars" → "zum Mars" (`planner.ts:393`); "Ankunft 120 km über Mars" → "über dem
  Mars" (`planner.ts:377, 422, 519`); "Automatisch landen auf Erde" → "auf der Erde"
  (`ComputerPanel.tsx:385`); "Aus der Bahn um Mond zurück zu Erde" (`planner.ts:230`);
  "Angekommen bei Mars!" → "beim Mars" (`FlightScreen.tsx:175`); "Satellit 1 kreist jetzt um Erde" →
  "um die Erde" (`flight.ts:1229`); "Er verlässt Erde für immer" (`flight.ts:1201`);
  "Flugbericht: gelandet auf Erde" (`FlightScreen.tsx:1897`); "Tiefster Punkt über Erde"
  (`planner.ts:638`).
- Fix: add grammatical forms to `Body` (e.g. `dat: 'dem Mars'`, `acc: 'den Mars'`, `to: 'zum Mars'`).

**RW-T03 · S2 · [verified] English decimal points in German UI.**

- "Gelandet auf: Erde, mit 3.4 m/s." (`src/rocket/flight.ts:1696`), challenge results "gelandet mit
  3.4 m/s" (`src/rocket/challenges.ts:111`), dock progress "· 1.2 m/s" (`:219`), stepper labels
  "−.1 / +.1" (`src/rocket/ComputerPanel.tsx:242, 249, 278, 285`).
- Fix: use the existing `fmt()` everywhere; lint rule against `toFixed` in UI strings.

**RW-T04 · S2 · [verified] Outdated number of challenges.**

- "…und neun Herausforderungen" (`src/pages/RocketPage.tsx:116`), "9 Herausforderungen"
  (`src/pages/HomePage.tsx:188`) – there are 10 (the page itself shows "0 / 30" stars).

**RW-T05 · S3 · [code] Controls table lists 6 SAS modes for keys 1–7.**

- `src/pages/RocketPage.tsx:34` ("aus, prograd, retrograd, radial, Ziel, Manöver"); the in-game help
  correctly says "radial außen/innen".

**RW-T06 · S3 · [code] Outdated physics text.**

- "Die Bahnvorhersage … rechnet Erde, Mond und Rakete gemeinsam – ein eingeschränktes
  Drei-Körper-Problem" (`src/pages/RocketPage.tsx:236-240`); the game integrates the Sun and eight
  bodies.

**RW-T07 · S3 · [code] World table has hard-coded values.**

- "Schwerkraft Erde / Mond 9,81 / 1,62" is typed into both columns (`src/pages/RocketPage.tsx:296-298`)
  instead of being computed from `world.ts`; Mars/Venus/Europa gravity is missing.

**RW-T08 · S3 · [code] Reaction wheel description is wrong.**

- "Die Rakete dreht sich fast doppelt so schnell" (`src/rocket/parts.ts:407`); code: one wheel = ×1.45,
  two wheels = ×1.9 (`src/rocket/flight.ts:1447`).

**RW-T09 · S4 · [code] "3 T" as abbreviation for days** (`src/rocket/format.ts:57`) – unusual; "3 d" or
"3 Tg." is clearer.

---

## 10. Lunas Sternenreise (KID)

**KID-01 · S2 · [verified] Canvas text is ~6 px on phones.**

- All canvas text is drawn in 800×560 game units and scaled down (`src/kids/LunaGame.tsx:348, 352,
310`). At 390 px width "★ 0 / 8", "Schwung: 34 %" and "Luna antippen, nach hinten ziehen,
  loslassen!" are unreadable – for the youngest target group.
- Fix: draw HUD text with a font size divided by `scale`, or as HTML overlay.

**KID-02 · S3 · [code] A cancelled touch launches Luna.**

- `onPointerCancel={onUp}` (`src/kids/LunaGame.tsx:432`): a system back swipe or palm rejection fires
  a launch. Use a separate cancel handler that just clears `aim`.

**KID-03 · S3 · [code] No keyboard alternative** for aiming/launching (pointer only).

**KID-04 · S3 · [code] Game loop is recreated on every render.**

- `useEffect(() => { requestAnimationFrame… })` without a dependency array (`src/kids/LunaGame.tsx:123-172`).

**KID-05 · S4 · [code] "Hilfe: Wo geht es lang?" shows the exact solution with no star penalty.**

**KID-06 · S4 · [verified] Result dialog polish.**

- Luna peeks out above the dialog; the "Wusstest du?" box uses the serif font, the rest sans-serif.

---

## 11. Missionen (MIS)

**MIS-01 · S3 · [verified] L1 mission: the start card covers the direction labels.**

- "← zur Sonne (148 Mio. km)" and "zur Erde (1,5 Mio. km) →" are hidden behind the card.

**MIS-02 · S3 · [verified] Trojaner: L5 is cut off.**

- The brief talks about L4 **and** L5, but the canvas crops the ring; L5 is outside. "L1" and
  "Jupiter" labels overlap the L1/L2 crosses.

**MIS-03 · S3 · [verified] Star rule without unit: "Start mehr als 0,05 von L4 entfernt".**

**MIS-04 · S4 · [verified] Missions header shows three filled gold stars next to "0 von 27 Sternen".**

- `src/pages/MissionsPage.tsx:19` (`<Stars count={3}>`).

**MIS-05 · S3 · [verified] Programmer notation in UI texts** (contradicts KRITIK #44):
"Startgeschwindigkeit (× v_Kreis)", "× v_K" (`src/missions/missions.ts:95ff`), Simulator
"1,03 × v_Kreis", Stabilitätskarte axis "(× v_Kreis)", Lagrange chip "μ_Routh", Quellen
"e_P … e_M" (`src/pages/SourcesPage.tsx:42`).

**MIS-06 · S4 · [code] L1 thrust buttons can stick** (no `onLostPointerCapture`,
`src/missions/L1Game.tsx:239-245`).

**MIS-07 · S4 · [code] L1 start offset is random** (`Math.random()`, `src/missions/L1Game.tsx:53`) –
difficulty differs between attempts, which makes star comparison unfair.

---

## 12. Quiz (QZ)

**QZ-01 · S2 · [verified] "Quer durch alle neun Kapitel" is false.**

- Intro `src/pages/QuizPage.tsx:49` and Home ("21 Fragen zu allen Kapiteln"). The 21 questions cover
  only chapters **2, 3, 4, 5, 7, 8** – nothing for 1, 6 (Gezeitenreibung) and 9.

**QZ-02 · S2 · [verified] Answers are never shuffled and are easy to guess.**

- Correct index distribution: option 2 → 11×, option 3 → 7×, option 4 → 2×, option 1 → 1×.
  The correct answer is the **longest option in 15 of 21 questions**. "Bestes Ergebnis" is
  meaningless after one run.
- Fix: shuffle options (and question order) per run; balance option lengths.

**QZ-03 · S3 · [verified] Programmer notation** in 5 questions ("a_z", "C_Mond", "v_K", …).

**QZ-04 · S4 · The quiz starts with chapter 7 (Hohle-Mond), not with chapter 2.**

**QZ-05 · S4 · [verified] Question heading is limited to the prose width and leaves half the card empty on desktop.**

---

## 13. Simulator and tools (SIM)

**SIM-01 · S2 · [verified] English decimals in the Simulator forecast and events.**

- `src/physics/assessment.ts:66, 92, 107-108`: "Gebunden: v/v_Flucht = 0.11.", "Halbachse 0.13
  Hill-Radien – Grenze 0.35 Hill-Radien", "C = 3.002294 > C(L1) = 3.000891" – next to German
  "0,256 Hill-Radien" on the same page.
- `src/sim/Simulation.ts:319, 331, 363`: "Aufprall mit 1.2 km/s", "1.3 Hill-Radien entfernt".

**SIM-02 · S3 · [verified] Mixed thousands separators on one page.**

- "realer Mond: 384 400 km" (space) vs. HUD "384.534 km" (dot); mission briefing "384 400 km".

**SIM-03 · S3 · [verified] Stabilitätskarte: theory labels are crossed by their own lines**
("Absturz (Theorie)", "Fluchtgeschw. (ohne Sonne)"); an unlabeled vertical line runs through the
middle of the map.

**SIM-04 · S3 · [verified] Lagrange-Labor: last column of the stability table ("Li…") is cut off at 1400 px.**

**SIM-05 · S4 · [verified] Home hero animation labels.**

- "Hill-Sphäre" and "Stabilitätsgrenze" are crossed by their dashed circles; "Erde"/"Mond" drown in
  the particle cloud (desktop and phone).

**SIM-06 · S4 · [verified] "Exzentrizität 0,0423" in the HUD vs. "Exzentrizität 0,055" in the preset text.**

- Correct physics (osculating value changes under the Sun's pull), but label the HUD value
  "(oskulierend)" like the chart does.

---

## 14. Content pages and routing (CON)

**CON-01 · S3 · [verified] Quellen page formatting.**

- Every entry lacks a space before "(Zugriff: …)" – e.g. "…articles/361615a0(Zugriff: 27.08.2026)"
  (`src/pages/SourcesPage.tsx:80-118`).
- Missing spaces from lost italics: "Geophysical Research Letters39", "Science339",
  "(Briaud et al.,Nature2023)".
- Mismatched quotes: „Klingelns" (must close with “).
- Duplicates: Wikipedia "Hollow Moon" 3× (different access dates), Physics World GRAIL 2×,
  SpaceDaily 2×, Weber NTRS 2× (different titles), Weber et al. 2011 in two lists.
- URLs are plain text, not links.

**CON-02 · S3 · [verified] Invalid chapter routes render chapter 1.**

- `#kapitel-0`, `#kapitel-10`, `#kapitel-abc` show "Einleitung" with tab title "Kapitel · Orbitlabor"
  and no active menu item. Missions handle this correctly ("Mission nicht gefunden").

**CON-03 · S4 · Unknown routes** (`#xyz`, `#sim-unbekannt`) silently fall back without correcting the URL.

**CON-04 · S4 · All mission pages are titled "Mission · Orbitlabor"** (tab title and phone top bar)
instead of the mission name (`src/app/App.tsx`, `PAGE_TITLES`).

**CON-05 · S4 · [verified] "Tipp anzeigen" in the mission sidebar is styled unlike every other button.**

---

## 15. Whole app (APP)

**APP-01 · S2 · [verified] The full-screen game does not block the page behind it.**

- While the game is open, the sidebar/topbar stay in the tab order and in the accessibility tree
  (the topbar "Menü öffnen" is still found by role while the game covers the screen). Tab moves focus
  to invisible elements. Fix: `inert` on `.app` while `html.game-open`, focus trap in `.game`.

**APP-02 · S3 · [code] Mobile navigation drawer:** no Esc to close, no focus trap, scrim is a
click-only `div` (`src/app/App.tsx`).

**APP-03 · S3 · [code] Saved progress is not type-checked.**

- `SaveStore.load()` merges stored JSON flatly (`src/engine/SaveStore.ts:26`). A malformed field
  (e.g. `rocketGoals` not an array, broken `rocketChallenges`) crashes the pages that call
  `.includes`/`Object.values` on it. Validate per field like `readSandbox()` does.

**APP-04 · S3 · [code] No error boundary.** Any render exception (e.g. RW-B02) blanks the whole app.

**APP-05 · S4 · [code] Work done on every render of the flight screen.**

- `useRef(makeFlight(...))` and `useRef(new RocketAudio())` evaluate their argument on every render
  (~10×/s because of the HUD tick) (`src/rocket/FlightScreen.tsx:293-295, 319`). Use lazy
  initialisation.

**APP-06 · S4 · [code, unverified] `ctx.filter = brightness(…)` for night scenes**
(`src/rocket/scene.ts:906`) is not supported by older Safari/iOS versions (no night dimming there)
and is expensive per frame.

---

## 16. Checked and found OK (no action needed)

- No console errors or failed requests (other than DEP-01) on 60 routes × 4 configurations.
- No horizontal page overflow on any route at 1400 px and 390 px, light and dark.
- Tab titles per page are set correctly (except CON-02/CON-04).
- Physics spot checks correct: RK4 integrators in `flight.ts`, scaled world (Hill radius ratio,
  Phobos escape speed 10.95 m/s matches the "11 m/s" tip), Roche limits 18,365/9,483 km, Routh
  criterion 0.0385, Domingos coefficients, hollow-sphere inertia formula.
- Frame times: ~17 ms average in flight view, ~18 ms in the map view (headless Chromium); the
  Mars transfer planner blocks the main thread for only ~43 ms.
- Save/load, sandbox rules, parachute arm/disarm/cut, staging and docking basic flows work.
