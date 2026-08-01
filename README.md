# Implementation Plan - Modern Farm Management & Farm Selector Upgrade

Improve the Farm Selector dropdown in AgroShield AI into an enterprise-grade precision agriculture farm selector backed by a SQLite database, CRUD APIs, React Query data fetching, searchable selector, status indicators, and farm summary card.

## User Review Required

> [!IMPORTANT]
> - **Backend Database Migration**: The `farms` table schema in SQLite will be updated to store `area`, `village`, `crop_stage`, `health_score`, `last_irrigation`, `weather_station`, and `status`. Existing test rows will be seeded with 5 realistic farms.
> - **Dependency Addition**: `@tanstack/react-query` will be added to `frontend/package.json` for reactive data fetching and mutation cache invalidation.
> - **State & Persistence**: Selected farm ID will be persisted in `localStorage` under key `selectedFarmId`.

## Proposed Changes

---

### Backend Components

#### [MODIFY] [database.py](file:///c:/Users/SURAJ%20THAKUR/OneDrive/Documents/.vscode/Agrofield%20AI/backend/backend/database.py)
- Extend `Farm` SQLAlchemy model with fields:
  - `name`: string
  - `crop_type`: string
  - `area`: float (acres)
  - `village`: string
  - `latitude`: float
  - `longitude`: float
  - `crop_stage`: string
  - `health_score`: integer
  - `last_irrigation`: string
  - `weather_station`: string
  - `status`: string ('healthy' | 'moderate' | 'high_risk')

#### [MODIFY] [routes.py](file:///c:/Users/SURAJ%20THAKUR/OneDrive/Documents/.vscode/Agrofield%20AI/backend/backend/routes.py)
- Seed 5 realistic farms:
  1. 🟢 North Farm (Rice) — 4.5 Acres, Surat, Flowering, Health: 92%, Yesterday, Healthy
  2. 🟡 South Farm (Cotton) — 6.2 Acres, Rajkot, Vegetative, Health: 78%, 3 days ago, Moderate
  3. 🥭 East Orchard (Mango) — 10.0 Acres, Junagadh, Fruiting, Health: 95%, Today, Healthy
  4. 🔴 Vegetable Plot (Tomato) — 2.0 Acres, Anand, Flowering, Health: 64%, 2 days ago, High Risk
  5. 🌽 Demo Farm (Maize) — 3.5 Acres, Vadodara, Ripening, Health: 88%, 4 days ago, Healthy
- Implement FastAPI REST CRUD Endpoints:
  - `GET /api/farms` — Return list of all farms
  - `POST /api/farms` — Create new farm (JSON / Form body)
  - `PUT /api/farms/{id}` — Update existing farm details
  - `DELETE /api/farms/{id}` — Delete farm by ID

---

### Frontend Components

#### [MODIFY] [package.json](file:///c:/Users/SURAJ%20THAKUR/OneDrive/Documents/.vscode/Agrofield%20AI/frontend/package.json)
- Add `@tanstack/react-query` to dependencies.

#### [MODIFY] [types.ts](file:///c:/Users/SURAJ%20THAKUR/OneDrive/Documents/.vscode/Agrofield%20AI/frontend/src/types.ts)
- Update `Farm` interface:
  ```ts
  export interface Farm {
    id: number
    farmName: string
    cropType: string
    area: number
    village: string
    latitude: number
    longitude: number
    cropStage: string
    healthScore: number
    lastIrrigation: string
    weatherStation: string
    status: 'healthy' | 'moderate' | 'high_risk'
  }
  ```

#### [NEW] [FarmSelector.tsx](file:///c:/Users/SURAJ%20THAKUR/OneDrive/Documents/.vscode/Agrofield%20AI/frontend/src/components/FarmSelector.tsx)
- Searchable combobox dropdown labelled **"Select Farm"**.
- Displays crop emoji (🌾, 🌱, 🥭, 🍅, 🌽) + status dot (🟢 Healthy, 🟡 Moderate Risk, 🔴 High Risk).
- Search input filters by farm name, crop type, or village.
- Bottom option `➕ Add New Farm` opens modal.

#### [NEW] [AddFarmModal.tsx](file:///c:/Users/SURAJ%20THAKUR/OneDrive/Documents/.vscode/Agrofield%20AI/frontend/src/components/AddFarmModal.tsx)
- Modal form with inputs for:
  - Farm Name
  - Crop Type
  - Area (Acres)
  - Village
  - Latitude & Longitude
- Uses React Query mutation to POST `/api/farms`, automatically invalidates cache, selects the new farm, and closes.

#### [NEW] [FarmSummaryCard.tsx](file:///c:/Users/SURAJ%20THAKUR/OneDrive/Documents/.vscode/Agrofield%20AI/frontend/src/components/FarmSummaryCard.tsx)
- Prominent Farm Summary Card displaying:
  - Farm Name & Crop Emoji badge
  - Area (Acres), Village, Growth Stage
  - Health Score (% bar & status badge)
  - Last Irrigation date/time

#### [MODIFY] [Dashboard.tsx](file:///c:/Users/SURAJ%20THAKUR/OneDrive/Documents/.vscode/Agrofield%20AI/frontend/src/components/Dashboard.tsx)
- Embed `FarmSummaryCard` at top of Dashboard.
- Automatically refresh and display weather, temp, humidity, wind, disease risk, soil moisture, and AI recommendations for the selected farm.

#### [MODIFY] [App.tsx](file:///c:/Users/SURAJ%20THAKUR/OneDrive/Documents/.vscode/Agrofield%20AI/frontend/src/App.tsx)
- Wrap application in `QueryClientProvider`.
- Replace old `<select>` with `FarmSelector`.
- Manage state for `selectedFarmId` with `localStorage` persistence (`selectedFarmId`).

---

## Verification Plan

### Automated & API Verification
- Check FastAPI startup and test `/api/farms` endpoint via curl or browser to verify seeded farm data format.
- Run `POST /api/farms` via curl to verify farm creation in SQLite.

### Manual Verification
- Open `http://localhost:5173/` in browser using `browser_subagent`.
- Verify top navbar shows **"Select Farm"** searchable dropdown.
- Check that all 5 farms are listed with crop emojis and status dots (🟢, 🟡, 🔴).
- Type in search input to filter farms (e.g. search "Cotton" or "Surat").
- Select a farm and verify that:
  - `FarmSummaryCard` updates with full details.
  - All Dashboard widgets (Weather, Temp, Wind, Humidity, Disease Risk) update dynamically.
  - Page refresh retains the selected farm via `localStorage`.
- Click `➕ Add New Farm`, fill in modal details, submit, and confirm new farm appears immediately and is selected.
