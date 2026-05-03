# TacNet Edge Operator Script

**Purpose:** click-by-click run sheet for the person operating the laptop.
**Presenter source:** `docs/presenter-script-source.md`
**Presenter speech:** `docs/presenter-script.md`
**Domain source:** `docs/team-b-domain-pitch-v3.md`
**Build shell:** `../sentinel-forge/`
**Target pitch length:** 3:00
**Live demo window:** 0:35-2:05

## Operator Rules

- Presenter speaks. Operator clicks.
- Do not narrate unless the presenter explicitly hands off.
- No menu diving, scrolling, DevTools, or browser network throttling on stage.
- One recovery attempt maximum. If the same thing fails twice, switch to backup video.
- Leave the final command picture on screen after the pitch.

## Preflight

Before going on stage:

- [ ] Backend running at `http://localhost:8000`.
- [ ] Frontend loaded at the Vite URL.
- [ ] `/state` returns Raven Gap.
- [ ] Browser zoom set to 110%.
- [ ] Notifications silenced; dock/menu distractions hidden.
- [ ] Replay Scenario button visible.
- [ ] Voice Report panel visible.
- [ ] Voice report fixture loaded: `raven_gap_salute_1`.
- [ ] Compression switch starts OFF.
- [ ] 3 Kbps meter visible.
- [ ] Compression OFF voice attempt tested: raw payload blocked.
- [ ] Compression ON voice attempt tested: SALUTE JSON fits and creates a source event.
- [ ] Map/COP renders MGRS grid, unit icons, NAIs, phase line, checkpoints.
- [ ] Mesh hierarchy visible.
- [ ] Compaction timeline visible.
- [ ] Evidence click tested.
- [ ] Backup video open in a hidden window.

## Timeline

| Time | Operator action | Screen target |
|---|---|---|
| 0:00-0:35 | Hands off. Presenter frames problem and solution. | Browser ready on starting state. |
| 0:35 | Click **Replay Scenario**. | Raven Gap COP visible; 3 Kbps meter visible; compression OFF. |
| 0:40 | Click **Voice Report** with compression OFF. | Raw voice/report bytes exceed budget; status blocked; no feed event. |
| 0:50 | Toggle **Compression ON**. Click **Voice Report** again. | Transcript and SALUTE JSON appear; JSON bytes fit; source event appears from `1/A`. |
| 1:02-1:13 | Let replay traffic run. If manual stepping is required, advance through the rehearsed report sequence. | Map markers pulse; source feed fills; mesh leaves activate. |
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
| Voice Report button fails | Continue with scripted source reports. | "The same SALUTE extraction feeds the source stream; continuing with the replay." |
| Compression switch fails | Use visible JSON display if present; otherwise continue to replay traffic. | "The product proof is payload discipline: raw traffic does not fit, structured meaning does." |
| Timeline fails but feed works | Continue with map/feed/SITREP. | "The feed is the source edge traffic; the SITREP is the rollup." |
| Evidence drawer fails | Point to contributing rows if visible; otherwise skip. | "The underlying reports remain attached to the SITREP." |
| 3 Kbps meter has no effect | Skip to close. | "The product goal is graceful degradation: shrink the information before command disappears." |

## Voice Fixture

The prerecorded report should match Team B's fixture:

> One Alpha reports one dismount moving south near NAI 1, grid 11 Sierra Lima Tango 12345 67890. Unknown unit, light pack, no visible crew-served weapon. Request UAS confirm.

Expected stored transcript:

> One Alpha reports one dismount moving south near NAI 1, grid 11SLT 12345 67890. Unknown unit, light pack, no visible crew-served weapon. Request UAS confirm.

Expected compressed event:

```json
{
  "type": "salute",
  "source": "1/A",
  "size": "1 dismount",
  "activity": "moving south",
  "location": "11SLT 12345 67890",
  "unit": "unknown dismount",
  "time": "T+45",
  "equipment": "light pack; no visible crew-served weapon",
  "request": "uas_confirm"
}
```

## Final Screen

Leave this visible:

- Raven Gap COP with MGRS grid, unit icons, NAIs, phase line, checkpoints, and risk zone.
- Voice panel showing compression ON and SALUTE JSON if it does not crowd the screen.
- Mesh hierarchy populated.
- Compaction timeline populated.
- Commander SITREP and delta visible.
- Evidence drawer open or evidence rows highlighted.
