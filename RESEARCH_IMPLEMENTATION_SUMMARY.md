# Research & Analytics Implementation Summary

## ✅ Completed Implementation

### Backend (Rust/Axum API)

**New Files Created:**

1. `rust/src/modules/research.rs` - Research analytics module with 4 endpoints
2. `rust/src/routes/research_routes.rs` - Route configuration
3. `rust/migrations/20250924_create_all_matches_filtered_view.sql` - Database migration

**Modified Files:**

1. `rust/src/modules/mod.rs` - Added research module
2. `rust/src/routes/mod.rs` - Added research routes  
3. `rust/src/main.rs` - Mounted `/research` endpoints

**API Endpoints:**

- `GET /research/distance-per-minute` - DTR aggregated time series
- `GET /research/distance-in-zone-per-minute` - Z2 (19.8-25.2 km/h) time series
- `GET /research/available-matches` - List all matches in analysis
- `GET /research/speed-zones-summary` - Speed zone statistics

### Frontend (Next.js/React)

**New Files Created:**

1. `new-front/app/research/page.tsx` - Research dashboard page with Recharts visualizations

**Modified Files:**

1. `new-front/app/components/SideNav.tsx` - Added "Research & Analytics" navigation link

### Features Implemented

✅ **Time Normalization**: All matches normalized to 100 minutes for comparative analysis  
✅ **DTR Chart**: Distance per minute across normalized match time (Figure 7 equivalent)  
✅ **Z2 Chart**: High-speed running distance per minute (Figure 8 equivalent)  
✅ **Configurable Filters**: Adjustable minimum minutes played threshold  
✅ **Match Overview**: Display all matches included in aggregated analysis  
✅ **Metadata Display**: Shows medians, sample counts, halftime markers  

## Key Technical Details

### Time Normalization Algorithm

```sql
FLOOR((elapsed_time / total_duration) * 100)::integer as normalized_minute
```

This normalizes any match duration to 100 minutes, with minute 50 representing halftime.

### Distance Calculation in Speed Zones

For Z2 zone (19.8-25.2 km/h):

```sql
(speed / 3.6) * 0.1 as distance_per_sample  -- 10Hz sampling
```

Only accumulates distance when speed is within zone thresholds.

### Player Filtering

Default: Only players with ≥85 minutes played are included in aggregations (configurable via query parameter).

## Database Requirements

### Critical: `all_matches_filtered` Materialized View

You need to populate this view with your match data:

```sql
-- Example structure
CREATE MATERIALIZED VIEW all_matches_filtered AS
SELECT 'match_1' as match_name, * FROM "your_gps_match_table_1"
UNION ALL
SELECT 'match_2' as match_name, * FROM "your_gps_match_table_2"
-- ... continue for all matches
;

-- Create indexes
CREATE INDEX idx_all_matches_match_name ON all_matches_filtered(match_name);
CREATE INDEX idx_all_matches_player ON all_matches_filtered(player_display_name);
CREATE INDEX idx_all_matches_elapsed_time ON all_matches_filtered(elapsed_time);
CREATE INDEX idx_all_matches_speed ON all_matches_filtered(speed);

-- Refresh when adding new matches
REFRESH MATERIALIZED VIEW all_matches_filtered;
```

**Required Columns:**

- `match_name` (text)
- `player_display_name` (text)
- `elapsed_time` (float8) - minutes since kickoff
- `speed` (float8) - km/h
- `distancia_total_calc` (float8) - cumulative distance in meters
- `lat`, `lon` (float8)
- `time` (text)
- `seconds_since_midnight` (float8)

## Testing the Implementation

### 1. Start the Backend

```bash
cd rust
cargo run
# API runs on http://localhost:8000
```

### 2. Test Endpoints

```bash
# Get distance per minute
curl "http://localhost:8000/research/distance-per-minute?min_minutes_played=85"

# Get Z2 distance per minute
curl "http://localhost:8000/research/distance-in-zone-per-minute?min_minutes_played=85"

# List available matches
curl "http://localhost:8000/research/available-matches"
```

### 3. Start the Frontend

```bash
cd new-front
npm run dev
# Navigate to http://localhost:3000/research
```

## Expected Output

### DTR Chart (Distance per Minute)

- X-axis: Normalized time (0-100 minutes)
- Y-axis: Distance (m/min)
- Shows characteristic pattern:
  - High values at start (minutes 0-5)
  - Progressive decline throughout match
  - Spike at halftime restart (minute ~50)
  - Lower values in final minutes due to fatigue

### Z2 Chart (High-Speed Running)

- X-axis: Normalized time (0-100 minutes)
- Y-axis: Distance in Z2 zone (m/min)
- Similar pattern but lower magnitude
- More pronounced kickoff spikes
- Lower baseline compared to total distance

## Next Steps

1. **Populate the Database**: Create and populate `all_matches_filtered` view with your match data
2. **Test API**: Verify endpoints return data
3. **Test Frontend**: Navigate to `/research` and verify charts render
4. **Customize**: Adjust filters, add more speed zones, or customize visualizations as needed

## Speed Zones Reference

| Zone | Speed (km/h) | Description |
|------|--------------|-------------|
| Z2 (HSR) | 19.8 - 25.2 | High Speed Running |
| Sprint | > 25.2 | Sprint zone |

Current implementation focuses on Z2, but the backend structure supports adding more zones (Z3, Z4, etc.).

## Files Reference

**Backend:**

- `/rust/src/modules/research.rs` - Core logic
- `/rust/src/routes/research_routes.rs` - Routes
- `/rust/migrations/20250924_create_all_matches_filtered_view.sql` - DB migration

**Frontend:**

- `/new-front/app/research/page.tsx` - Research page
- `/new-front/app/components/SideNav.tsx` - Navigation (updated)

**Documentation:**

- `/RESEARCH_FEATURE.md` - Detailed feature documentation
- `/RESEARCH_IMPLEMENTATION_SUMMARY.md` - This file
