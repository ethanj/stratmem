# TacNet Edge Operator Script

**Purpose:** click-by-click run sheet for the person operating the laptop.
**Presenter source:** `docs/demo/presenter-script-source.md`
**Presenter speech:** `docs/demo/presenter-script.md`
**Domain source:** `docs/demo/team-b-domain-pitch-v3.md`
**Runtime:** main dashboard + second-machine sender prototype
**Target pitch length:** 3:00
**Live demo window:** 0:35-2:05

## Operator Rules

- Presenter speaks. Operator clicks.
- Do not narrate unless the presenter explicitly hands off.
- No menu diving, scrolling, DevTools, or browser network throttling on stage.
- One recovery attempt maximum. If the same thing fails twice, switch to backup video.
- Leave the final command picture on screen after the pitch.
- The projected screen is the main dashboard only. Keep sender/prototype tabs off projector.

## Live Topology

Main/projected laptop:

- Backend: `http://localhost:8000`
- Dashboard: `http://localhost:5173?room=0000&signal=http://<sender-ip>:8787`
- This dashboard is the embedded S2 receiver. No separate receiver tab is needed.

Second/sender laptop:

- Prototype server: `node prototype/server.mjs`
- Sender page: `http://localhost:8787/?role=sender&room=0000`
- Role must be `sender`.

Room names are exact and case-sensitive. Use:

```text
0000
```

## Preflight

Before going on stage:

- [ ] Backend running at `http://localhost:8000`.
- [ ] Frontend loaded at `http://localhost:5173?room=0000&signal=http://<sender-ip>:8787`.
- [ ] `/state` returns Raven Gap.
- [ ] Browser zoom set to the rehearsed value.
- [ ] Notifications silenced; dock/menu distractions hidden.
- [ ] Replay Scenario button visible.
- [ ] `S2 RX 0000` chip visible on the map.
- [ ] Sender laptop opened at `http://localhost:8787/?role=sender&room=0000`.
- [ ] Sender page role is `sender`; room is `0000`.
- [ ] Sender peer connection tested against dashboard receiver.
- [ ] Sender sample/manual report tested once, then backend reset.
- [ ] Squad 1 / 1-A RFL are not red before the live send.
- [ ] Compression starts OFF.
- [ ] 3 Kbps meter visible.
- [ ] Compression OFF attempt tested: raw voice/report blocked or no commander update.
- [ ] Compression ON attempt tested: second-machine frame received; map/readiness updates.
- [ ] Map/COP renders MGRS grid, unit icons, NAIs, phase line, checkpoints.
- [ ] SITREP/evidence path tested.
- [ ] Backup video open in a hidden window.

Clean reset immediately before stage:

```bash
curl -X POST http://localhost:8000/reset
```

Then hard-refresh the dashboard if it still shows a previous received frame.

## Timeline

| Time | Operator action | Screen target |
|---|---|---|
| 0:00-0:35 | Hands off. Presenter frames problem and solution. | Browser ready on starting state. |
| 0:35 | Ensure the Raven Gap COP is centered. If needed, click **Replay Scenario**. | COP visible; `S2 RX 0000` visible; 3 Kbps context visible; compression OFF. |
| 0:40 | On sender laptop, play/speak the report and send once while compression is OFF. | Projected dashboard should not add a new commander update; if the voice overlay is open, it shows raw blocked. |
| 0:50 | Turn semantic compression ON using the rehearsed control. Send the same report again from the sender laptop. | Dashboard receives the S2 frame; map/readiness changes; source/voice state reflects received compressed report. |
| 1:02-1:13 | Keep hands off unless replay requires one click. | Presenter explains that reports arrive; map/readiness/status update stays visible. |
| 1:13-1:25 | Let compaction update. | Source reports collapse into squad summaries. |
| 1:25-1:38 | Let commander SITREP appear. | SITREP and delta fill; NAI/risk zone updates. |
| 1:38 | Click one SITREP evidence line. | Evidence drawer opens, or source rows highlight. |
| 1:48 | Move pointer to the 3 Kbps meter and pause. | Meter shows raw over budget and compacted fits. |
| 1:55-2:05 | Hands off. | Final state holds: map, mesh, timeline, SITREP, evidence. |
| 2:05-3:00 | Hands off unless presenter asks for final screen adjustment. | Final command picture stays visible. |

## Failure Moves

| Symptom | Recovery | Presenter line if needed |
|---|---|---|
| Frontend blank | Refresh once; then backup video. | "For time, here's the same run captured from rehearsal." |
| Backend request fails | Refresh once after checking backend terminal; then backup video. | "One moment, restarting the scenario." |
| Map tiles fail | Use dark vector/static fallback already in panel. | Do not mention tile loading. |
| Replay button does nothing | Reset scenario and click Replay once. | "Restarting the scenario." |
| Sender page does not connect | Confirm sender URL uses `room=0000` and dashboard URL uses `signal=http://<sender-ip>:8787`; refresh sender once. | "The sender is reconnecting to the receiver room." |
| S2 RX chip stays error/connecting | Confirm prototype server is running on sender laptop and dashboard has the correct `signal=` URL; if still stuck, use backup path. | "For time, we'll use the rehearsed backend path." |
| OFF send does not show blocked | Continue to ON send; the pitch-critical proof is the received compressed commander update. | "Raw voice is over budget; now watch the semantic frame fit." |
| ON send does not update map | Use the Voice tab fallback or backup video. | "For time, here's the same received-frame path from rehearsal." |
| Compression control fails | Use visible receiver/map update if present; otherwise backup video. | "The product proof is payload discipline: raw traffic does not fit, structured meaning does." |
| Timeline fails but feed works | Continue with map/feed/SITREP. | "The feed is the source edge traffic; the SITREP is the rollup." |
| Evidence drawer fails | Point to contributing rows if visible; otherwise skip. | "The underlying reports remain attached to the SITREP." |
| 3 Kbps meter has no effect | Skip to close. | "The product goal is graceful degradation: shrink the information before command disappears." |

## Voice Fixture

Presenter line:

> Here is one spoken SALUTE report from One Alpha: one dismount moving south near NAI 1, grid 11SLT 12345 67890.

Current implemented sender/receiver path uses the P0 9-line/CASEVAC fixture for the readiness map update. If the sender UI offers samples, use the CASEVAC sample for the live transmission unless the code has been updated to the SALUTE fixture.

Expected operational effect after successful ON send:

- S2 receiver decodes a compact binary frame.
- The commander picture updates.
- 1st Squad / affected soldier readiness changes after the report.
- SITREP/evidence path can be shown if time allows.

## Final Screen

Leave this visible:

- Raven Gap COP with MGRS grid, unit icons, NAIs, phase line, checkpoints, and risk zone.
- S2 receiver/map update visible.
- Voice panel hidden unless the presenter asks for byte details.
- Commander SITREP and delta visible if they do not crowd the map.
- Evidence drawer open or evidence rows highlighted.
