# SF-dashboard-PulsePoint: Knowledge Transfer Document

## 1. Project Overview

**PulsePoint SF** is a real-time crime data dashboard for San Francisco featuring:
- 3D interactive map with extruded buildings
- Crime incident feed with infinite scroll
- Analytics charts (time patterns, categories, resolution rates)
- Cloud-based SQL analytics via MotherDuck (DuckDB in the browser)

### Architecture Diagram

```
+-------------------+       +------------------+       +-------------------+
|   DataSF API      |       |   MapTiler API   |       |   MotherDuck      |
| (SF Open Data)    |       | (Vector Tiles)   |       | (Cloud DuckDB)    |
+--------+----------+       +--------+---------+       +--------+----------+
         |                           |                           |
         | HTTP/JSON                 | Tiles + Terrain           | WASM Client
         v                           v                           v
+------------------------------------------------------------------------+
|                        Next.js 15 Frontend                              |
|                                                                        |
|  +------------------+   +--------------------+   +------------------+  |
|  | /crime route     |   | / (home) route     |   | /motherduck      |  |
|  | - Dashboard      |   | - 3D Map           |   | - DB Testing     |  |
|  | - Charts         |   | - deck.gl overlay  |   | - Query UI       |  |
|  | - Crime Cards    |   | - Building data    |   |                  |  |
|  +------------------+   +--------------------+   +------------------+  |
|                                                                        |
|  +------------------+   +--------------------+   +------------------+  |
|  | lib/api.js       |   | motherduck/context |   | app/crime/utils  |  |
|  | (HTTP Client)    |   | (DB Connection)    |   | (Data Processing)|  |
|  +------------------+   +--------------------+   +------------------+  |
+------------------------------------------------------------------------+
```

### Tech Stack

| Library | Version | Purpose |
|---------|---------|---------|
| Next.js | 15.4.5 | React framework with App Router |
| React | 19.1.0 | UI component library |
| deck.gl | 9.1.14 | 3D geospatial data visualization |
| @maptiler/sdk | 3.7.0 | Vector tile basemap + terrain |
| @motherduck/wasm-client | 0.5.0 | In-browser DuckDB SQL queries |
| Recharts | 3.1.0 | Charts (bar, pie, area) |
| Axios | 1.11.0 | HTTP client with interceptors |
| Turbopack | (bundled) | Fast dev server bundler |

---

## 2. Getting Started

### Prerequisites
- Node.js 18+
- npm

### Setup

```bash
cd SF-dashboard-PulsePoint/frontend/pulsepointsf
npm install
```

### Environment Variables

Create `.env.local` in `frontend/pulsepointsf/`:

```env
NEXT_PUBLIC_MAPTILER_KEY=your_maptiler_api_key
NEXT_PUBLIC_DUCK_READ_TOKEN=your_motherduck_read_token
NEXT_PUBLIC_DUCK_WRITE_READ_TOKEN=your_motherduck_readwrite_token  # optional
NEXT_PUBLIC_API_URL=http://localhost:8000  # optional, for backend API
```

**Where to get keys:**
- MapTiler: https://cloud.maptiler.com/account/keys (free tier: 100k requests/month)
- MotherDuck: https://app.motherduck.com → Settings → Access Tokens

### Run Development Server

```bash
npm run dev  # Starts on localhost:3000 with Turbopack
```

### Routes
- `/` — 3D map of San Francisco
- `/crime` — Crime data dashboard with charts
- `/motherduck` — MotherDuck connection testing page

---

## 3. Project Structure

```
frontend/pulsepointsf/
├── app/
│   ├── page.js                          # Home: 3D map with fullscreen toggle
│   ├── layout.js                        # Root layout
│   ├── globals.css                      # Global styles
│   ├── components/
│   │   └── SanFrancisco3D.js           # * Core 3D map component
│   ├── crime/
│   │   ├── page.js                     # * Crime dashboard (data fetching, scroll)
│   │   ├── constants.js                # * API URLs, categories, colors
│   │   ├── utils.js                    # * Data processing functions
│   │   └── components/
│   │       ├── DashboardHeader.js       # Sticky header with controls
│   │       ├── StatsBar.js              # Stats and filter toggles
│   │       ├── CategoryExplorer.js      # Collapsible category breakdown
│   │       ├── ChartsSection.js        # * All Recharts visualizations
│   │       └── CrimeCard.js             # Individual incident card
│   └── motherduck/
│       └── page.js                      # DB connection testing dashboard
├── lib/
│   └── api.js                          # * Centralized HTTP client
├── motherduck/
│   └── context/
│       └── motherduckClientContext.js   # * React Context for DB connection
├── public/
│   └── data/
│       ├── twin-towers-demo.json        # GeoJSON for 3D buildings
│       └── sf-iconic-buildings.json     # Additional building data
├── package.json
└── next.config.mjs

# Files marked * are the most important to understand first
```

---

## 4. 3D Map Implementation

**File:** `app/components/SanFrancisco3D.js`

### How It Works

MapTiler provides the basemap (streets, labels, terrain). deck.gl adds a WebGL overlay on top for data visualization (3D extruded buildings, heatmaps, etc).

### Step 1: Dynamic Import (SSR disabled)

WebGL doesn't work during server-side rendering. Use Next.js dynamic import:

```javascript
// app/page.js
import dynamic from 'next/dynamic';
import '@maptiler/sdk/dist/maptiler-sdk.css'; // Required CSS

const SanFrancisco3D = dynamic(() => import('./components/SanFrancisco3D'), {
  ssr: false,  // Critical: WebGL only works client-side
  loading: () => <p>Loading 3D Map...</p>
});
```

### Step 2: Initialize MapTiler

```javascript
// app/components/SanFrancisco3D.js
'use client';
import * as maptilersdk from '@maptiler/sdk';

const mapContainer = useRef(null);
const map = useRef(null);

useEffect(() => {
  if (map.current) return; // Prevent re-initialization

  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  maptilersdk.config.apiKey = apiKey;

  map.current = new maptilersdk.Map({
    container: mapContainer.current,
    style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`,
    center: [-122.4194, 37.7749],  // <-- CHANGE THIS for another city
    zoom: 13,                       // <-- Adjust zoom level
    pitch: 60,                      // 3D angle (0 = top-down, 60 = angled)
    bearing: -30,                   // Map rotation in degrees
    terrain: true,                  // 3D terrain
    apiKey: apiKey
  });

  return () => { map.current?.remove(); map.current = null; };
}, []);
```

### Step 3: Add deck.gl Overlay with 3D Buildings

```javascript
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer } from '@deck.gl/layers';

const overlay = useRef(null);

// After map init:
overlay.current = new MapboxOverlay({
  interleaved: true,  // Proper 3D depth sorting with map buildings
  layers: []
});
map.current.addControl(overlay.current);

// When building data loads:
useEffect(() => {
  if (!overlay.current || !buildingData) return;

  const buildingsLayer = new GeoJsonLayer({
    id: 'buildings-3d',
    data: buildingData,           // GeoJSON with polygon features
    extruded: true,               // Enable 3D extrusion
    filled: true,
    getElevation: (f) => f.properties?.height || 30,  // Height in meters
    getFillColor: (f) => {
      // Color based on category or height
      const height = f.properties?.height || 30;
      const intensity = Math.min(140 + (height / 100) * 40, 200);
      return [intensity, intensity, intensity, 210]; // RGBA
    },
    getLineColor: [60, 60, 60, 255],
    material: {
      ambient: 0.35,
      diffuse: 0.6,
      shininess: 32,
      specularColor: [30, 30, 30]
    }
  });

  overlay.current.setProps({ layers: [buildingsLayer] });
}, [buildingData]);
```

### How to Change Location

To point the map at a different city, change these values:

```javascript
// Example: New York City
center: [-74.006, 40.7128],
zoom: 12,
pitch: 55,
bearing: -20,

// Example: London
center: [-0.1276, 51.5074],
zoom: 13,
pitch: 60,
bearing: 0,
```

Then provide GeoJSON building data for that city (or remove the building layer entirely — the basemap works anywhere).

---

## 5. MotherDuck / DuckDB WASM Integration

**File:** `motherduck/context/motherduckClientContext.js`

### Architecture: React Context Pattern

MotherDuck runs DuckDB directly in the browser via WebAssembly. The connection is managed through React Context so any component can run SQL queries.

### Connection Setup

```javascript
'use client';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import 'core-js/actual/promise/with-resolvers';  // Polyfill for Promise.withResolvers

export const MotherDuckContext = createContext(null);

export function MotherDuckClientProvider({ children, database }) {
  const [connectionStatus, setConnectionStatus] = useState('initializing');
  const [connectionError, setConnectionError] = useState(null);
  const connectionRef = useRef();

  // Promise.withResolvers lets us resolve the connection promise externally
  if (connectionRef.current === undefined) {
    connectionRef.current = Promise.withResolvers();
  }

  const initializeConnection = async () => {
    setConnectionStatus('connecting');

    // Step 1: Get token from env
    const token = process.env.NEXT_PUBLIC_DUCK_WRITE_READ_TOKEN
      || process.env.NEXT_PUBLIC_DUCK_READ_TOKEN;

    if (!token) throw new Error('No MotherDuck token found');

    // Step 2: Check WebAssembly support
    if (typeof WebAssembly === 'undefined') {
      throw new Error('WebAssembly not supported');
    }

    // Step 3: Dynamic import of WASM client
    const { MDConnection } = await import('@motherduck/wasm-client');

    // Step 4: Create connection
    const connection = await MDConnection.create({
      motherduckToken: token,
      database: database || undefined
    });

    // Step 5: Test connectivity
    await connection.evaluateQuery('SELECT 1 as test_connection');

    // Step 6: Resolve promise so queries can execute
    connectionRef.current.resolve(connection);
    setConnectionStatus('connected');
  };

  useEffect(() => { initializeConnection(); }, [database]);

  // ... context value and provider
}
```

### Running Queries

```javascript
// Standard query (throws on error)
const evaluateQuery = async (query) => {
  const connection = await connectionRef.current.promise;
  const result = await connection.evaluateQuery(query);
  return result; // result.data.toRows() gives array of row objects
};

// Safe query (returns {success, result} or {success: false, error})
const safeEvaluateQuery = async (query) => {
  const connection = await connectionRef.current.promise;
  const result = await connection.safeEvaluateQuery(query);
  return result;
};
```

### Using in Components

```javascript
import { useMotherDuckClientState } from '@/motherduck/context/motherduckClientContext';

function MyComponent() {
  const { evaluateQuery, connectionStatus } = useMotherDuckClientState();

  const fetchData = async () => {
    const result = await evaluateQuery(`
      SELECT incident_category, COUNT(*) as count
      FROM sf_crime_incidents
      GROUP BY incident_category
      ORDER BY count DESC
      LIMIT 10
    `);
    const rows = result.data.toRows();
    // rows = [{incident_category: "Larceny Theft", count: 234}, ...]
  };
}
```

### Database Schema (for SF crime data)

```sql
CREATE TABLE sf_crime_incidents (
  incident_id VARCHAR PRIMARY KEY,
  incident_category VARCHAR,
  incident_subcategory VARCHAR,
  incident_description VARCHAR,
  incident_datetime TIMESTAMP,
  incident_date DATE,
  incident_time TIME,
  incident_year INTEGER,
  incident_day_of_week VARCHAR,
  latitude DOUBLE,
  longitude DOUBLE,
  analysis_neighborhood VARCHAR,
  police_district VARCHAR,
  supervisor_district INTEGER,
  resolution VARCHAR,
  report_type_code VARCHAR,
  filed_online BOOLEAN,
  hour_of_day INTEGER,
  day_of_week_num INTEGER
);
```

---

## 6. Data Pipeline

**Files:** `app/crime/constants.js`, `app/crime/utils.js`

### Fetching from Open Data API

```javascript
// constants.js — API configuration
export const DATASF_API_URL = 'https://data.sfgov.org/resource/wg3w-h783.json';
export const FETCH_LIMIT = 1000;
export const API_QUERY = `${DATASF_API_URL}?$limit=${FETCH_LIMIT}&$where=latitude IS NOT NULL AND longitude IS NOT NULL`;
```

The DataSF API uses **SoQL** (Socrata Query Language), which is similar to SQL:
- `$limit` — max records
- `$where` — filter conditions
- `$order` — sort order
- `$select` — choose columns

### Data Validation

```javascript
// crime/page.js — Filter invalid records after fetch
const validRecords = data.filter(record =>
  record.incident_datetime &&
  record.incident_category &&
  record.incident_description &&
  record.latitude &&
  record.longitude
);
```

### Category Grouping

```javascript
// constants.js — Map raw categories into logical groups
export const CRIME_CATEGORIES = {
  violent: ['Assault', 'Homicide', 'Robbery', 'Rape', 'Kidnapping', ...],
  property: ['Larceny Theft', 'Burglary', 'Motor Vehicle Theft', 'Arson', ...],
  drug: ['Drug Offense', 'Liquor Laws'],
  publicOrder: ['Disorderly Conduct', 'Warrant', 'Traffic Violation Arrest', ...]
};

// Anything not matching these groups goes into "other"
```

### Chart Data Processing

```javascript
// utils.js — Transform raw data into chart-ready format

// Time distribution (24-hour pattern)
export const processTimeChartData = (sortedData) => {
  const hourCounts = {};
  for (let i = 0; i < 24; i++) hourCounts[i] = 0;

  sortedData.forEach(incident => {
    const hour = new Date(incident.incident_datetime).getHours();
    if (!isNaN(hour)) hourCounts[hour]++;
  });

  return Object.entries(hourCounts).map(([hour, count]) => ({
    hour: `${hour}:00`,
    count,
    percentage: ((count / sortedData.length) * 100).toFixed(1)
  }));
};

// Day of week pattern
export const processDayOfWeekChartData = (sortedData) => {
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayCounts = {};
  dayOrder.forEach(day => dayCounts[day] = 0);

  sortedData.forEach(incident => {
    const day = incident.incident_day_of_week;
    if (day && dayCounts.hasOwnProperty(day)) dayCounts[day]++;
  });

  return dayOrder.map(day => ({
    day: day.substring(0, 3),
    count: dayCounts[day],
    percentage: ((dayCounts[day] / sortedData.length) * 100).toFixed(1)
  }));
};
```

### Swapping in a Different Data Source

Most US cities publish open data on Socrata platforms. The API pattern is the same:

| City | API Base URL | Dataset ID |
|------|-------------|------------|
| San Francisco | `data.sfgov.org` | `wg3w-h783` |
| Chicago | `data.cityofchicago.org` | `ijzp-q8t2` |
| New York | `data.cityofnewyork.us` | `5uac-w243` |
| Los Angeles | `data.lacity.org` | `2nrs-mtv8` |
| Seattle | `data.seattle.gov` | `tazs-3rd5` |

Replace `DATASF_API_URL` with: `https://{domain}/resource/{dataset_id}.json`

Then update the field names in `utils.js` (each city names columns slightly differently).

---

## 7. Crime Dashboard Architecture

**File:** `app/crime/page.js`

### Component Hierarchy

```
CrimeDataDashboard (page.js)
├── DashboardHeader     — sticky top bar, record count, sort toggle
├── StatsBar            — visible items count, category explorer toggle
├── CategoryExplorer    — collapsible grouped breakdown
├── ChartsSection       — Recharts grid (bar, pie, area)
└── CrimeCard[]         — individual incident cards (infinite scroll)
```

### Infinite Scroll Pattern

```javascript
// State
const [visibleItems, setVisibleItems] = useState(INITIAL_VISIBLE_ITEMS); // 20

// Memoized visible slice
const visibleData = useMemo(() => {
  return sortedData.slice(0, visibleItems);
}, [sortedData, visibleItems]);

// Scroll handler on the container div
const handleScroll = useCallback((e) => {
  const { scrollTop, scrollHeight, clientHeight } = e.target;
  const scrollPercentage = scrollTop / (scrollHeight - clientHeight);

  if (scrollPercentage > SCROLL_THRESHOLD && visibleItems < sortedData.length) {
    setVisibleItems(prev => Math.min(prev + ITEMS_PER_LOAD, sortedData.length));
  }
}, [visibleItems, sortedData.length]);

// Attach to scrollable container
<div onScroll={handleScroll} style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
  {visibleData.map((incident, i) => <CrimeCard key={incident.incident_id} incident={incident} />)}
</div>
```

### Memoized Data Processing

```javascript
// All chart data is memoized — only recalculates when source data changes
const categoryExplorerData = useMemo(() =>
  processCategoryExplorerData(sortedData), [sortedData]);

const timeChartData = useMemo(() =>
  processTimeChartData(sortedData), [sortedData]);

// Chain memos when one depends on another
const categoryGroupChartData = useMemo(() =>
  processCategoryGroupChartData(categoryExplorerData), [categoryExplorerData]);
```

### Recharts Usage

```javascript
// ChartsSection.js
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
         ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Wrap in ResponsiveContainer for auto-sizing
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={categoryGroupChartData} margin={{ top: 5, right: 30, left: 20, bottom: 40 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
    <XAxis dataKey="category" angle={-45} textAnchor="end" height={60} />
    <YAxis />
    <Tooltip />
    <Bar dataKey="count">
      {categoryGroupChartData.map((entry, i) => (
        <Cell key={i} fill={entry.fill} />
      ))}
    </Bar>
  </BarChart>
</ResponsiveContainer>
```

---

## 8. API Layer

**File:** `lib/api.js`

### Centralized Axios Client

```javascript
import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: add auth token + logging
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.metadata = { startTime: new Date() };
  return config;
});

// Response interceptor: log duration + categorize errors
apiClient.interceptors.response.use(
  (response) => {
    const duration = new Date() - response.config.metadata?.startTime;
    console.log(`[API] ${response.status} ${response.config.url} (${duration}ms)`);
    return response;
  },
  (error) => {
    if (error.response) console.error('Server error:', error.response.status);
    else if (error.request) console.error('Network error');
    else console.error('Setup error:', error.message);
    return Promise.reject(error);
  }
);
```

### Domain-Specific Methods

```javascript
export const pulsePointAPI = {
  getRecentCrimeData: async (hours = 24, limit = 500) => {
    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
    const query = new URLSearchParams({
      '$where': `incident_datetime >= '${hoursAgo.toISOString()}'`,
      '$limit': limit.toString(),
      '$order': 'incident_datetime DESC'
    });
    return axios.get(`https://data.sfgov.org/resource/wg3w-h783.json?${query}`);
  },

  // CRUD patterns
  getIndividuals: (filters = {}) => api.get('/api/individuals', filters),
  createIndividual: (data) => api.post('/api/individuals', data),
  updateIndividual: (id, data) => api.put(`/api/individuals/${id}`, data),

  // File upload with progress
  transcribeAudio: (audioFile, onProgress) => {
    const formData = new FormData();
    formData.append('audio', audioFile);
    return apiClient.post('/api/transcription', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
};
```

---

## 9. Adapting for Another City/Dataset

### Checklist

1. **Map coordinates** — Change `center`, `zoom`, `pitch`, `bearing` in `SanFrancisco3D.js`

2. **Data API** — Replace `DATASF_API_URL` in `constants.js` with the new city's Socrata endpoint (or any JSON API)

3. **Field names** — Update field references in `utils.js` and `page.js`:
   - `incident_datetime` → your timestamp field
   - `incident_category` → your category field
   - `incident_day_of_week` → your day field
   - `latitude` / `longitude` → your coordinate fields

4. **Category groupings** — Redefine `CRIME_CATEGORIES` in `constants.js` based on the new city's incident types

5. **Colors** — Update `CATEGORY_COLORS` to match new categories

6. **Building data** — Replace `public/data/twin-towers-demo.json` with GeoJSON for the new city's buildings (or remove the building layer)

7. **MotherDuck schema** — Create a new table matching the new city's fields:
   ```sql
   CREATE TABLE {city}_incidents (
     id VARCHAR PRIMARY KEY,
     category VARCHAR,
     datetime TIMESTAMP,
     latitude DOUBLE,
     longitude DOUBLE,
     -- ... city-specific fields
   );
   ```

8. **Component labels** — Update text in `DashboardHeader.js`, loading states, etc.

### What's Generic (reuse as-is)
- deck.gl + MapTiler initialization pattern
- MotherDuck Context provider architecture
- Infinite scroll logic
- Recharts chart components
- Axios client with interceptors
- Data processing utility pattern (processFoo functions)

### What's SF-Specific (must change)
- API URL and SoQL query parameters
- Field names in data processing
- Category groupings and colors
- Map coordinates
- Building GeoJSON data
- Page titles and labels

---

## 10. Environment Variables Reference

| Variable | Required | Purpose | Where to Get |
|----------|----------|---------|--------------|
| `NEXT_PUBLIC_MAPTILER_KEY` | Yes (for map) | MapTiler vector tile API key | https://cloud.maptiler.com |
| `NEXT_PUBLIC_DUCK_READ_TOKEN` | Yes (for MotherDuck) | Read-only MotherDuck access | https://app.motherduck.com |
| `NEXT_PUBLIC_DUCK_WRITE_READ_TOKEN` | Optional | Read-write MotherDuck access | https://app.motherduck.com |
| `NEXT_PUBLIC_API_URL` | Optional | Backend API base URL | Your backend deployment |

All `NEXT_PUBLIC_` vars are exposed to the browser bundle. Never put secrets (backend-only tokens) here.

---

## 11. Gotchas and Lessons Learned

### WebGL / 3D Map
- **Must use `ssr: false`** with `next/dynamic` — WebGL crashes during server render
- **Import MapTiler CSS** (`@maptiler/sdk/dist/maptiler-sdk.css`) in the parent page, not the component
- **MapTiler API key is in the client bundle** — use domain restrictions in MapTiler dashboard
- **Map resize on layout change** — call `map.current.resize()` after container size changes
- **deck.gl `interleaved: true`** — required for proper depth sorting with map's 3D buildings

### MotherDuck / DuckDB WASM
- **Requires `core-js/actual/promise/with-resolvers`** polyfill (not all browsers support it yet)
- **Read-only tokens can't CREATE/INSERT** — the `safeEvaluateQuery` pattern handles this gracefully
- **Dynamic import** of `@motherduck/wasm-client` is required (large WASM binary)
- **First connection is slow** (~2-3 seconds) due to WASM download
- **`result.data.toRows()`** converts DuckDB result to JS array of objects

### Data Fetching
- **DataSF API has no auth** — free and open, but subject to rate limits
- **SoQL `$where` clause** needs single quotes around string values
- **Null coordinates exist** — always filter `WHERE latitude IS NOT NULL`
- **Date ranges** — DataSF data goes back to 2018; older data uses different formats

### React / Next.js 15
- **`'use client'`** required for any component using hooks, event handlers, or browser APIs
- **`useMemo` chains** — when one memo depends on another, list the dependency correctly
- **`useCallback` for scroll handlers** — prevents re-creating the function on every render
- **Inline styles** used throughout (no CSS framework) — works fine for dashboards, but consider Tailwind for larger projects

### Performance
- **Fetch 1000 records max** from API — more causes visible lag
- **Infinite scroll** (20 items at a time) prevents DOM bloat
- **`useMemo`** prevents recalculating chart data on every render
- **Dynamic imports** keep initial bundle small (map code only loads when needed)
