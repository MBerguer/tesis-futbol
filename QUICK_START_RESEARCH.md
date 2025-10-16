# Quick Start: Research Analytics Dashboard

## 🎯 What Was Built

A complete research analytics section that mirrors the academic analysis shown in your thesis screenshots (Figures 7 & 8).

### Visual Components

1. **DTR Chart** - Distance traveled per minute across normalized match time
2. **Z2 Chart** - High-speed running (19.8-25.2 km/h) per minute
3. **Match List** - All matches included in the analysis
4. **Filters** - Adjustable minimum minutes played threshold

## 🚀 Quick Setup

### Step 1: Populate the Materialized View

You mentioned you have a materialized view `all_matches_filtered`. If not already created, here's how:

```sql
-- Drop if exists
DROP MATERIALIZED VIEW IF EXISTS all_matches_filtered;

-- Create by combining all your GPS match tables
CREATE MATERIALIZED VIEW all_matches_filtered AS
SELECT 
    'nacional_vs_penarol_2024_05_15' as match_name, 
    *
FROM "gps_nacional_vs_penarol_2024_05_15"

UNION ALL

SELECT 
    'nacional_vs_liverpool_2024_06_20' as match_name, 
    *
FROM "gps_nacional_vs_liverpool_2024_06_20"

-- Add UNION ALL for each match table...
;

-- Create indexes for performance
CREATE INDEX idx_all_matches_match_name ON all_matches_filtered(match_name);
CREATE INDEX idx_all_matches_player ON all_matches_filtered(player_display_name);
CREATE INDEX idx_all_matches_elapsed_time ON all_matches_filtered(elapsed_time);
CREATE INDEX idx_all_matches_speed ON all_matches_filtered(speed);
```

### Step 2: Start the Services

```bash
# Terminal 1: Start backend
cd rust
cargo run

# Terminal 2: Start frontend  
cd new-front
npm run dev
```

### Step 3: Access the Dashboard

Open browser: `http://localhost:3000/research`

## 📊 What You'll See

### Chart 1: Total Distance per Minute (DTR)

Similar to **Figura 7** from your thesis:

- Progressive decline throughout the match
- Higher values at start of each half
- Median reference line
- Halftime marker at minute 50

### Chart 2: Distance in Z2 (High-Speed Running)

Similar to **Figura 8** from your thesis:

- Distance covered at 19.8-25.2 km/h per minute
- Kickoff spikes visible
- Lower baseline than total distance
- Clear first/second half separation

## 🎛️ Controls

**Minimum Minutes Played Filter**

- Default: 85 minutes
- Adjustable from UI
- Only includes players who played at least this duration
- Matches your "Jugadores con ≥ 85 minutos jugados" criterion

## 🔧 API Endpoints

All endpoints available at `http://localhost:8000/research/`:

```bash
# Get DTR time series
GET /research/distance-per-minute?min_minutes_played=85

# Get Z2 time series  
GET /research/distance-in-zone-per-minute?min_minutes_played=85

# List all matches
GET /research/available-matches

# Speed zone statistics
GET /research/speed-zones-summary
```

## 📁 Files Created

### Backend (Rust)

```
rust/src/
├── modules/
│   ├── research.rs              ← New research module
│   └── mod.rs                   ← Updated
├── routes/
│   ├── research_routes.rs       ← New routes
│   └── mod.rs                   ← Updated
├── main.rs                      ← Updated (added /research mount)
└── migrations/
    └── 20250924_create_all_matches_filtered_view.sql  ← New
```

### Frontend (Next.js)

```
new-front/app/
├── research/
│   └── page.tsx                 ← New research dashboard
└── components/
    └── SideNav.tsx              ← Updated (added link)
```

## 🔍 How It Works

### Time Normalization

Each match is normalized to 100 minutes using `seconds_since_midnight` for proper synchronization:

```sql
-- Calculate match boundaries from actual time of day
match_start = MIN(seconds_since_midnight)
match_end = MAX(seconds_since_midnight)

-- Normalize to 0-100
normalized_minute = ((seconds_since_midnight - match_start) / (match_end - match_start)) * 100
```

**Why `seconds_since_midnight`?**

- The `elapsed_time` field is based on when the coach turned on the GPS device
- `seconds_since_midnight` represents actual time of day, ensuring proper match synchronization
- Example: Match at 3:00 PM = 54000 seconds since midnight

Example normalization:

- 90-minute match: 45 actual minutes → normalized minute 50
- 95-minute match: 47.5 actual minutes → normalized minute 50
- 105-minute match: 52.5 actual minutes → normalized minute 50

### Distance Aggregation

For each normalized minute:

1. Calculate distance traveled by each player in that minute
2. Average across all players (who played ≥ min_minutes)
3. Average across all matches

### Speed Zone Filtering (Z2)

Only distance traveled at speeds between 19.8-25.2 km/h:

```
IF speed >= 19.8 AND speed < 25.2:
    accumulate_distance
```

## 🎨 Navigation

The research section is accessible from:

- **Sidebar**: "Research & Analytics" (abbreviated "RS" when collapsed)
- **Direct URL**: `/research`
- Located between "Upload PDF + CSV" and "Admin" sections

## 📈 Expected Patterns

### DTR (Distance per Minute)

- **Kickoff (min 0-5)**: ~110-120 m/min (high intensity)
- **Mid first-half (min 20-40)**: ~100-105 m/min (steady state)
- **Pre-halftime (min 45-50)**: ~95-100 m/min (fatigue)
- **Halftime restart (min 50-55)**: ~105-110 m/min (renewed intensity)
- **Late second-half (min 85-100)**: ~85-95 m/min (significant fatigue)

### Z2 Distance (High-Speed Running)

- **Kickoff (min 0-5)**: ~6-8 m/min (tactical intensity)
- **Steady state**: ~4-5 m/min
- **Late match**: ~3-4 m/min (reduced high-speed efforts)

## ⚙️ Customization

### Add More Speed Zones

Edit `rust/src/modules/research.rs`:

```rust
const Z3_MIN_KMH: f64 = 25.2;
const Z3_MAX_KMH: f64 = 30.0;
const Z4_MIN_KMH: f64 = 30.0;
```

### Change Normalization Duration

Edit `NORMALIZED_MATCH_DURATION` constant:

```rust
const NORMALIZED_MATCH_DURATION: f64 = 90.0;  // For 90-min normalization
```

### Adjust Default Filter

Edit `new-front/app/research/page.tsx`:

```typescript
const [minMinutesPlayed, setMinMinutesPlayed] = useState(70);  // 70 min threshold
```

## 🐛 Troubleshooting

**No data showing:**

- Verify `all_matches_filtered` view exists and has data
- Check API responds: `curl http://localhost:8000/research/available-matches`
- Verify environment variable: `NEXT_PUBLIC_API_URL`

**API errors:**

- Ensure DATABASE_URL is set in backend environment
- Check PostgreSQL is running
- Verify materialized view has required columns

**Charts not rendering:**

- Check browser console for errors
- Verify recharts is installed: `npm list recharts`
- Check data structure matches TypeScript interfaces

## 📚 References

- **RESEARCH_FEATURE.md** - Detailed technical documentation
- **RESEARCH_IMPLEMENTATION_SUMMARY.md** - Implementation overview
- Database schema in thesis screenshots (all_matches_filtered structure)

---

**Built with:** Rust + Axum + PostgreSQL + Next.js + Recharts
