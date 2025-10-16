# Research & Analytics Feature

## Overview

This feature provides aggregated time-series analysis across all championship matches, similar to the analysis shown in academic research (e.g., Figures 7 and 8 from thesis documents).

## Key Features

### 1. Time Normalization

- All matches are normalized to 100 minutes for comparative analysis
- Uses `seconds_since_midnight` (actual time of day) rather than device-based elapsed time
- For each match, calculates: `(current_seconds - match_start_seconds) / (match_end_seconds - match_start_seconds) * 100`
- Allows aggregation across matches of different durations
- Splits matches at the 50-minute mark (halftime)

### 2. Available Metrics

#### Distance per Minute (DTR)

- **Endpoint**: `GET /research/distance-per-minute`
- **Query Params**: `min_minutes_played` (default: 85)
- Calculates average distance traveled per normalized minute across all matches
- Shows progressive decline typical of match fatigue patterns

#### Distance in Speed Zone Z2 (19.8-25.2 km/h)

- **Endpoint**: `GET /research/distance-in-zone-per-minute`
- **Query Params**: `min_minutes_played` (default: 85)
- Measures high-speed running distance per normalized minute
- Shows higher values at start of each half (kickoff spikes)

#### Additional Endpoints

- `GET /research/available-matches` - List all matches included in analysis
- `GET /research/speed-zones-summary` - Summary statistics for speed zones

## Database Schema

### Required: `all_matches_filtered` Materialized View

The research endpoints depend on a materialized view called `all_matches_filtered` that aggregates GPS data from all match tables:

```sql
CREATE MATERIALIZED VIEW all_matches_filtered AS
SELECT 'match_nacional_penarol_2024' as match_name, * FROM "gps_match_nacional_penarol_2024"
UNION ALL
SELECT 'match_liverpool_2024' as match_name, * FROM "gps_match_liverpool_2024"
UNION ALL
...;
```

#### Required Columns

- `match_name` (text) - Identifier for the match
- `player_display_name` (text) - Player name
- `seconds_since_midnight` (float8) - **Critical**: Time of day in seconds (used for match synchronization)
- `speed` (float8) - Speed in km/h
- `distancia_total_calc` (float8) - Cumulative distance in meters (optional)
- `lat`, `lon` (float8) - GPS coordinates (optional for some analyses)
- `time` (text) - Timestamp
- `heart_rate` (int8) - Heart rate (optional)
- `instantaneous_acceleration` (float8) - Acceleration (optional)

### Refreshing the View

After adding new match data:

```sql
REFRESH MATERIALIZED VIEW all_matches_filtered;
```

## Frontend Usage

Navigate to `/research` in the dashboard to:

1. View aggregated DTR charts (similar to Figure 7)
2. View Z2 distance charts (similar to Figure 8)
3. Filter by minimum minutes played (default: 85 minutes)
4. See list of all matches included in analysis

### UI Components

- **Charts**: Built with Recharts library
- **Filters**: Adjustable minimum minutes played threshold
- **Metadata**: Shows median values, sample counts, halftime markers

## Technical Implementation

### Backend (Rust/Axum)

- **Module**: `rust/src/modules/research.rs`
- **Routes**: `rust/src/routes/research_routes.rs`
- **Base Path**: `/research/*`

### Frontend (Next.js/React)

- **Page**: `new-front/app/research/page.tsx`
- **Navigation**: Added to SideNav as "Research & Analytics" (RS)

### Performance Considerations

- Queries use CTEs for efficient aggregation
- Materialized view should have indexes on `match_name`, `player_display_name`, `elapsed_time`, `speed`
- Consider refreshing materialized view during off-peak hours

## Speed Zones Reference

| Zone | Speed Range (km/h) | Description |
|------|-------------------|-------------|
| Z2   | 19.8 - 25.2      | High Speed Running |
| Sprint | > 25.2         | Sprint zone |

## Future Enhancements

Potential additions:

- [ ] Additional speed zones (Z3, Z4, etc.)
- [ ] Match-specific filters (select specific matches)
- [ ] Position-based analysis
- [ ] Export functionality (CSV, PNG)
- [ ] Comparison with literature benchmarks
- [ ] Player-specific drill-down from aggregated view

## Example API Responses

### Distance per Minute

```json
{
  "data": [
    {
      "normalized_minute": 0,
      "distance_m_per_min": 115.3,
      "sample_count": 450
    },
    ...
  ],
  "metadata": {
    "min_minutes_played": 85.0,
    "normalized_duration": 100.0,
    "median": 102.4
  }
}
```

### Available Matches

```json
{
  "matches": [
    {
      "match_name": "gps_match_nacional_penarol",
      "player_count": 18,
      "duration_minutes": 95.2
    },
    ...
  ]
}
```
