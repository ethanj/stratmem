# Military C2 Interface — Design Reference

A detailed breakdown of a professional tactical Command & Control (C2) display, captured from a reference screenshot showing "Operation Iron Shield" — a company-level engagement at the 1st Platoon, Alpha Company level.

---

## Overall Layout

Full-screen, edge-to-edge dark display. No wasted space. Three-column layout:

### Side-by-Side: Reference C2 vs TacNet Edge

```
REFERENCE (C2 Interface)                                    TACNET EDGE (Current Frontend)
============================================                ============================================


+--------------------------------------------+              +--------------------------------------------+
|                                            |              |                                            |
|  NET: *  OPERATION IRON SHIELD             |              |  TACNET EDGE     [REPLAY] [STEP] [RESET]   |
|  [MAP | OPS | INTEL | COMM | LOG | ADMIN]  |              |  EW DEGRADED  3 KBPS meter       TIME 06:10|
|  UNCLASSIFIED            TIME: 14:32:18L   |              |                                            |
|                                            |              +--------------------------------------------+
+------------+------------------+------------+              |                                            |
|            |                  |            |              |          MESH HIERARCHY  (top strip)        |
|            |                  |            |              |   PL > 1ST_SQUAD > TEAM_A, TEAM_B ...      |
|            |                  |            |              |                                            |
+------------+------------------+------------+              +------------+------------------+------------+
|            |                  |            |              |            |                  |            |
|  LEFT      |   CENTER MAP    |   RIGHT    |              |  SOURCE    |   TACTICAL       |  COMMANDER |
|  SIDEBAR   |                  |   SIDEBAR  |              |  REPORTS   |   PICTURE        |  SITREP    |
|  ~20%      |   MGRS grid     |   ~20%     |              |            |                  |            |
|            |   terrain        |            |              |  (LogStream|   (MapLibre      |  (Incident |
|  Unit ID   |   unit markers  |  Contacts  |              |   with     |    map with      |   Card +   |
|  Strength  |   phase lines   |  Assets    |              |   callsign |    MGRS grid,    |   evidence |
|  Sub Units |   objectives    |  Supporting|              |   pills,   |    NAI polygons, |   lines)   |
|  Soldiers  |   waypoints     |  Units     |              |   event    |    friendly &    |            |
|  Summary   |                  |            |              |   feed)    |    contact       | ---------- |
|            |                  |            |              |            |    markers)      |  SITREP    |
|            |                  |            |              |            |                  |  DELTA     |
|            |                  |            |              |            |                  |            |
+------------+------------------+------------+              +------------+------------------+------------+
|                                            |              |            |                  |            |
|  MISSION TIMELINE  (horizontal events)     |              |  TACNET    |   COMPACTION     |  FORCE     |
|  DRAW | MEASURE | MARK | LAYER | OVERLAY  |              |  INDICATORS|   TIMELINE       |  PICTURE   |
|  MAP CENTER: 34T KP 12345 67890            |              |  (signals) |   (squad sums)   |  (assets)  |
|  ELEV: 412m              [+] [-]  2D | 3D |              |            |                  |            |
|                                            |              +------------+------------------+------------+
+--------------------------------------------+              |                                            |
                                                            |  EvidenceDrawer  (slide-in overlay)        |
                                                            |                                            |
                                                            +--------------------------------------------+
```

### Key Structural Differences

| Element | Reference C2 | TacNet Edge |
|---------|-------------|-------------|
| **Top bar** | Operation name + tab nav (MAP/OPS/INTEL/COMM/LOG/ADMIN) + classification banner + time | Brand + playback controls (REPLAY/STEP/RESET) + EW comms meter + time |
| **Left sidebar** | Unit ID card, strength, subordinate units, soldier status table, unit summary bars | LogStream (source reports feed with callsign pills) |
| **Center** | Tactical map (MGRS grid, NATO symbols, phase lines, objectives) | MapLibre map (MGRS grid, custom markers, phase lines, NAIs) |
| **Right sidebar** | Contacts (enemy/friendly/neutral tabs), Assets, Supporting Units | IncidentCard (Commander SITREP) + SitrepDeltaPanel |
| **Bottom strip** | Mission Timeline (horizontal event dots) + map toolbar + MGRS status bar | TacNet Indicators + CompactionTimeline + Force Picture (3 panels) |
| **Mesh/hierarchy** | Embedded in left sidebar under Subordinate Units | Full-width top strip (dedicated panel) |
| **Evidence drill-down** | None visible | EvidenceDrawer (slide-in from right) |
| **Collapsible sections** | Yes — chevron toggles on every section | No — fixed grid panels |
| **Tabs** | MAP/OPS/INTEL/COMM/LOG/ADMIN | None — single-view dashboard |
| **Visual style** | Flat/military: no glows, no gradients, no animations | Sci-fi: glows, scan overlays, pulse animations, backdrop-blur |
| **Symbology** | NATO APP-6 rectangles | Custom geo-marker labels with glow effects |
| **Data font** | Monospace throughout for all data | Monospace only for IDs/coords; Inter sans-serif elsewhere |

---

## Top Bar

- **Left**: Hamburger menu, NET indicator (green dot), operation name "OPERATION IRON SHIELD"
- **Center**: Tab navigation — **MAP** (active/highlighted) | OPS | INTEL | COMM | LOG | ADMIN
- **Center top**: "UNCLASSIFIED" classification banner in **red bold text** — always visible, never hidden
- **Right**: TIME: 14:32:18L, DATE: 05/24/2024, notification bell icons (with badge counts), settings gear

---

## Left Sidebar

Stacked collapsible sections with chevron (v) toggle buttons. Each section can expand/collapse independently.

### 1. Unit Identification Card
```
[SHIELD ICON]  1ST PLATOON, ALPHA COMPANY
               STATUS: IN CONTACT       (red text)
               GRID: 34T KP 12345 67890
               DTR: 14:30:00L
               PLAN: ATTACK
               ORDER: 5-24-24 OPORD 1
```
- Dark green unit shield/emblem with crossed rifles icon
- Status field uses semantic color: "IN CONTACT" = red, would be green for "SECURE"
- GRID is MGRS format
- DTR = Date-Time Reference (local time)

### 2. STRENGTH Section
```
PERSONNEL: 28 / 31       VEHICLES: 2 / 2
```
Compact inline readout. Current/total format.

### 3. SUBORDINATE UNITS Section
Table with rows per subordinate element:
```
[unit symbol] 1ST PLATOON    28 / 31  (green dot)
[unit symbol] 2ND PLATOON    30 / 31  (green dot)
[unit symbol] 3RD PLATOON    27 / 31  (green dot)
[unit symbol] HQ SECTION     10 / 10  (green dot)
[unit symbol] WEAPONS PLATOON 15 / 17 (amber dot)
```
- Each row: NATO unit symbol (small rectangle with type marker), name, strength ratio, status dot
- Status dots: green = full strength, amber = degraded (Weapons Platoon at 15/17)
- Strength shows current/authorized

### 4. SOLDIER STATUS Section
Dense data table with column headers:
```
NAME                STATUS  HEALTH  AMMO       EQUIP
SGT M. JOHNSON       *     90%     5.56 210   [icon]
  TEAM LEADER                      40MM  12
CPL D. MARTINEZ       *    100%    5.56 180   [icon]
  SQUAD LEADER                     40MM  12
PFC J. WILSON         *    100%    5.56 200   [icon]
  AUTOMATIC RIFLEMAN
PFC A. BROWN          *     80%    5.56 150   [icon]
  RIFLEMAN
PFC T. DAVIS          +     60%    5.56 120   [icon]
  COMBAT MEDIC                               (headset)
PFC R. TAYLOR         *    100%    5.56 200   [icon]
  RIFLEMAN
              VIEW ALL (28)
```
- Name column: rank + last name on first line, role/MOS on second line in smaller text
- STATUS: colored dot (green = good, red cross = wounded/medic)
- HEALTH: percentage, color-coded (100%=green, 80%=green, 60%=amber)
- AMMO: caliber + round count, secondary caliber on next line (40MM)
- EQUIP: small monochrome equipment icon per soldier
- "VIEW ALL (28)" link at bottom to expand full roster

### 5. UNIT STATUS SUMMARY Section
Category bars showing aggregate readiness:
```
PERSONNEL  110/120 [========--]    VEHICLES  7/8 [=========-]
MORTARS    2/2     [==========]    DRONES    3/3 [==========]
ARTILLERY  2/2     [==========]    SUPPLIES  85% [=========-]
```
- Horizontal fill bars, colored green when above threshold
- Two-column layout: category pairs side by side
- Text shows raw count or percentage

---

## Center Map

### Base Layer
- **Dark topographic terrain** — contour-like elevation features in dark blue/gray tones
- Very dark background, terrain features visible through subtle shading
- Terrain labels in neutral gray: "HILL 205", "HILL 165", "RIVER CROSSING"

### Grid Overlay
- **MGRS grid** with numbered axes:
  - Horizontal (eastings): 10, 11, 12, 13, 14, 15, 16, 17, 18, 19
  - Vertical (northings): 59, 60, 61, 62, 63, 64, 65, 66, 67
- Grid lines in very subtle cyan/blue, barely visible — dense enough for coordination but not distracting

### Tactical Graphics

**Phase Lines:**
- Dashed blue lines spanning the map width
- "PHASE LINE BRAVO" labeled at the line
- "PL ALPHA" shown further south

**Objectives:**
- Labeled areas: "OBJ EAGLE" (north-center), "OBJ IRON" (east-center)
- Text labels in neutral/white

**Friendly Units (blue):**
- NATO APP-6 rectangular symbols with unit type markers inside
- Blue rectangles with white/blue text designations: "1-1 A", "1-2 A", "HQ", "2-1 A"
- Movement direction arrows on some units
- "A/1-3" shown as a smaller element north

**Enemy Contacts (red):**
- Red diamond markers: "ENY 1 PLT" (north-east, largest)
- Smaller red markers for "ENY ATGM", "ENY MORTAR" positions
- Labels in green-yellow on the map itself

**Waypoints:**
- Small green dots labeled "WP1", "WP2", "WP3" along planned routes
- Connected by implied route lines

**Scale Bar:**
- Bottom-left of map: 0 — 250 — 500 — 750 — 1000m
- Clean horizontal bar with tick marks

---

## Right Sidebar

### 1. CONTACTS Section
**Tab filter bar at top:** ALL | **ENEMY** (selected/highlighted) | FRIENDLY | NEUTRAL

Each contact is a card with structured fields:
```
[red diamond icon] ENY 1 PLT
                   GRID: 34T KP 178 665
                   TYPE: INFANTRY
                   SIZE: PLATOON
                   ACTIVITY: MOVING
                   LAST SEEN: 14:28:10L

[red diamond icon] ENY ATGM
                   GRID: 34T KP 162 642
                   TYPE: ATGM TEAM
                   SIZE: TEAM
                   ACTIVITY: OBSERVED
                   LAST SEEN: 14:25:40L

[red diamond icon] ENY MORTAR
                   GRID: 34T KP 155 631
                   TYPE: MORTAR TEAM
                   SIZE: TEAM
                   ACTIVITY: FIRING
                   LAST SEEN: 14:20:15L
```
- Icon matches the map marker style (red diamond with number badge)
- Name in bold, all fields in ALL CAPS
- "VIEW ALL CONTACTS" link at bottom

### 2. ASSETS Section
Each asset shows platform type, status, and key metrics:
```
[drone icon] RQ-7 SHADOW 01
             STATUS: ON STATION
             ENDURANCE: 02:15:30
             FEED: LIVE (green)

[drone icon] RQ-7 SHADOW 02
             STATUS: ON STATION
             ENDURANCE: 01:45:20
             FEED: LIVE (green)

[arty icon]  M777 BATTERY (A/1-77)
             STATUS: READY (green)
             ROUNDS: 24
             LOCATION: 34T KP 070 555

[helo icon]  COBRA 21 (AH-1Z)
             STATUS: AVAILABLE (green)
             FUEL: 78%
             LOCATION: 10 KM NW
```
- Small platform thumbnail/icon on left
- Status values are color-coded: READY/AVAILABLE/LIVE = green
- Endurance shown as countdown timer (HH:MM:SS)
- Different metrics per platform type (rounds for arty, fuel for helo, endurance for drone)

### 3. SUPPORTING UNITS Section
```
[unit symbol] B CO 1-23 IN
              DIST: 1.5 KM SE
              STATUS: ON MISSION

[unit symbol] 3-69 AR
              DIST: 2.2 KM SW
              STATUS: AVAILABLE

[unit symbol] DIV ISR PLT
              DIST: 5.0 KM N
              STATUS: ON STATION
```
- NATO unit symbols per entry
- Distance and cardinal direction from own position
- Status color-coded

---

## Bottom Strip

### Mission Timeline
Horizontal timeline with event markers at timestamps:
```
* 13:45              * 13:58           * 14:05              * 14:12              * 14:28
1ST PLT CROSSED      CONTACT           ARTY FIRE MISSION    DRONE LAUNCHED       ENY ATGM SPOTTED
PHASE LINE ALPHA     ENY 1 PLT         GRID: 34T KP 162 642 RQ-7 SHADOW 01      GRID: 34T KP 162 642
```
- Dots on a horizontal line, evenly distributed
- Each event: timestamp, title, detail line (grid ref or asset name)
- Different dot colors possible for event type (contact vs movement vs fires)

### Map Toolbar
Bottom bar with tool buttons:
```
DRAW | MEASURE | MARK | LAYER | OVERLAY | ROUTES | SYMBOLS | CLEAR
```
- Icon + label for each tool
- All caps labels

### Status Bar
```
MAP CENTER: 34T KP 12345 67890    ELEV: 412m    + TOOLS    [+][-]    2D | 3D
```
- Current map center in MGRS
- Elevation at center point
- Zoom controls
- Perspective toggle
- 2D/3D view switch

---

## Design Principles

1. **Maximum information density** — no decorative elements, no empty space, every pixel serves a purpose
2. **ALL CAPS for everything** — headers, labels, values, unit names, coordinates — creates uniform visual weight and military formality
3. **Strict color coding** — red=enemy/threat, blue/cyan=friendly, green=good/ready, amber=caution/degraded, gray=neutral/inactive
4. **Dark theme** — near-black navy background reduces eye strain in darkened TOC environments and makes colored elements pop
5. **Flat/functional** — no glows, no gradients on content, no animations, no shadows on data elements; decoration is absent
6. **Collapsible sections** — every sidebar section has a chevron toggle so operators can manage screen real estate for their current task
7. **Monospace for data** — coordinates, grid references, timestamps, ammo counts, and numeric data all in monospace for column alignment
8. **NATO standard symbology** — unit markers follow APP-6 rectangles with type designators, not custom icons
9. **Tabular alignment** — data fields snap to columns; labels left-aligned, values right-aligned or fixed-width
10. **Status via color, not chrome** — a green dot means good, a red dot means critical; no elaborate badges or icons needed
11. **Hierarchical sections** — information flows top-to-bottom from unit ID > strength > subordinates > individuals > summary; each level adds granularity
12. **"VIEW ALL" expansion pattern** — show the most important N items, offer expansion for the full list; don't scroll the sidebar

---

## Color Palette (estimated from screenshot)

| Swatch | Hex (approx) | Role |
|--------|-------------|------|
| Near-black navy | #0a0e1a | Background |
| Dark blue-gray | #111828 | Panel backgrounds |
| Subtle cyan | #1a3a5c | Grid lines, borders |
| White | #e8f0ff | Primary text, headings |
| Gray | #7a8a9c | Secondary text, labels |
| Blue | #3b8edd | Friendly unit symbols |
| Cyan | #22d3ee | Grid numbers, interactive |
| Red | #e53e3e | Enemy markers, IN CONTACT, classification |
| Green | #22c55e | Status dots, READY, bars |
| Amber | #d4a017 | Degraded status, caution |
| Yellow-green | #b8cc3c | Enemy type labels on map |

---

## Key Takeaways for Design Inspiration

- The interface reads as a **working tool, not a display** — every element is interactive or informational
- **Density is a feature**, not a bug — operators are trained to read this; simplification loses data
- The **map is the hero** — it gets 50%+ of screen real estate because the COP (Common Operating Picture) is the primary decision surface
- **Time is always visible** — timestamps on events, DTR on unit card, endurance on assets, "last seen" on contacts
- **Everything has a grid reference** — MGRS coordinates on the unit card, every contact, every asset, the map center; spatial awareness is fundamental
- The **bottom timeline** is the temporal equivalent of the map — it shows the battle's progression linearly while the map shows it spatially
