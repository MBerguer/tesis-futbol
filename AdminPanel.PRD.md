Perfect 👌.
📄 Product Requirements Document (PRD)

Project: rust-futbol
Date: 11/09/2025
Owner: Data/Software Team
Stack: Backend (Rust + Axum + SQLx + PostgreSQL), Frontend (Next.js), DB (Postgres), Parsing (PDF + manual upload).

⸻

1. Product Objective
This module is part of a larger project, which is responsible for managing soccer matches.
Currently, there is a module that stores GPS data from soccer matches, which is responsible for analyzing the data and generating reports.
The objective of this submodule is to create an internal soccer match management platform (initially for Club Nacional de Football, Youth category), which allows:
• Automatically persist match information extracted from official PDFs.
• Manually complete missing information (e.g., YouTube videos, card reasons, player data).
• Centralize and structure data in a PostgreSQL database for queries, reports, and dashboards.

⸻

2. Scope

2.1 Inclusions
• Loading matches from PDF (initial parser that extracts the basics: teams, date, players, goals, cards).
• Administrative interface (Next.js) to validate/edit information and load missing data.
• REST API (Axum) to expose CRUD for matches, teams, players, and events.
• Persistence in PostgreSQL following a standardized relational model.
• Management of external links (e.g., YouTube video per match).

2.2 Exclusions
• Integration with external real-time data providers.
• Performance analysis algorithms (speed, sprints, GPS).
• Advanced access control (currently a single administrative role).

⸻

3. Users and Use Cases

3.1 Main Users
• Club administrators
• Upload match PDFs.
• Edit extracted information.
• Add YouTube links.
• Sports analysts
• Query structured data for reports.
• Export matches to CSV/Excel.

3.2 Key Use Cases
1. Automatic upload:
• Admin uploads PDF.
• System parses it and generates records for matches, lineups, and events.
2. Manual review:
• Admin opens the newly created match in the UI.
• Corrects errors (e.g., incorrectly parsed player names).
• Adds notes or videos.
3. Query:
• Analyst requests a list of matches by category.
• Obtains details for each player in that match (minutes, goals, cards).

⸻

4. High-Level Flow
1. PDF Ingestion → Rust Backend (parser)
• PDF is processed with predefined rules.
• Draft match is saved to DB.
2. Manual Validation → Next.js Frontend
• Admin edits data in web form.
• API exposes CRUD endpoints (/matches, /teams, /players, /events).
3. Final Persistence → PostgreSQL
• Data is ready for reporting or export.

⸻

5. Functional Requirements

Backend (Rust + Axum + SQLx)
• Team CRUD (/teams).
• Player CRUD (/players).
• Match CRUD (/matches).
• Event CRUD (/events).
• /upload_pdf Endpoint → receives PDF, parses, and saves draft.
• Integrity validation (e.g., players must belong to a team).

Frontend (Next.js)
• Basic login (optional, can only be restricted access).
• Match dashboard with filters (by date, tournament, category).
• Detailed match view:
• General information (date, venue, teams, result).
• Editable starting and substitute roster.
• Event list (goals, cards, substitutions).
• Field to add a YouTube link.
• "Save and Confirm" button.

⸻

6. Non-functional requirements
• Database: PostgreSQL, migrations managed with sqlx migrate.
• Scalability: Support at least 500 matches and 1,000 players without degradation.
• Interface: Intuitive and fast UI for administrators with little technical experience.
• Availability: 99% (on-prem or private cloud).
• Internationalization: Initial language: Spanish.

⸻

7. Initial API (example)

GET /matches

Returns list of matches.

POST /matches

Create match.

GET /matches/{id}

Match details with teams, players, and events.

POST /upload_pdf

Upload PDF → returns JSON with parsed data + generated match_id.

PUT /matches/{id}

Update match (includes YouTube link, notes).

⸻

8. Risks and Mitigations
• Inconsistent PDF parsing: Mitigate with manual UI validation.
• Errors in player data: Mitigate with search/autocomplete from the players table.
• Slow adoption by administrators: Mitigate with a simple UI, tutorial, and step-by-step validation.

⸻

9. Future Extensions (not included in MVP)
• Integration with GPS and performance metrics.
• Advanced analytics dashboards.
• GraphQL API for flexible queries.
• User roles (admin, analyst, coach).
⸻

10. Addenda and clarifications (based on sample PDF and youth context)

• PDF reality: Official sheets like the provided one are often rasterized (image-only via HiQPdf). The system must detect text vs image and use OCR when needed, otherwise fall back to manual entry in the admin UI.
• Jerseys: The PDF does not include jersey numbers and, at youth level, jerseys rotate frequently. Identity must not rely on jersey numbers. Any `jersey_number` is optional and purely informational when known.
• Player identity: Use an administrative spreadsheet as the source of truth. Each player has a unique national_id. Provide a simple import to create/update players from that sheet and use national_id for matching.
• New/rotating players: Support quick-create of unknown players during match review with minimal fields (full_name, national_id, team) so admins can proceed without blockers.
• Idempotent uploads: Avoid duplicates on re-upload using a `source_pdf_hash` and basic match fingerprint (date, teams). Re-uploads return the existing draft match.
• Event semantics: Support goals (regular/penalty/own-goal), cards (yellow, second_yellow → send-off, red), substitutions, and stoppage time using minute + added_time (e.g., 45 + 2).
• Validation: 11 starters per team; all events must reference players in the match; minute 0–120 and added_time 0–15; own-goal credited to opponent; red/second_yellow implies no further play.
• Confidence and review: Parser assigns confidence per field; UI surfaces low-confidence items first and highlights diffs between parsed data and admin edits.
• Observability and async: PDF processing (including OCR) runs as a background job with status polling; structured logs and sample artifact retention for troubleshooting.
• Locale/timezone: Spanish-first UI, proper handling of diacritics, and dates/times stored in UTC with club-local rendering.

⸻

11. Data model (MVP)

• teams: id, name, short_name
• players: id, full_name, national_id (unique), dob?, current_team_id?, active
• administrativo (source of truth): "Documento_de_Identidad" (PK, int), "Jugador", ... other administrative fields
• competitions: id, name, season
• venues: id, name, city
• matches: id, date_time, competition_id, venue_id, category, home_team_id, away_team_id, home_score, away_score, youtube_url, notes, source_pdf_hash, parse_confidence
• match_players: id, match_id, team_id, player_id, role (starter|sub), position?, jersey_number (nullable)
• events: id, match_id, team_id, player_id (nullable for own_goal if needed), event_type (goal|pen_goal|own_goal|yellow|second_yellow|red|sub_on|sub_off), minute, added_time, assist_player_id?, reason?, data_json
• officials (optional): id, match_id, role, full_name

Indexes/constraints:
• players.national_id UNIQUE; foreign keys on match relations; optional composite uniqueness for matches (date_time + home + away) if useful.

⸻

12. API additions

• GET /api/players?search=... → for autocomplete and fuzzy name lookup.
• POST /api/players/import → upload CSV/Excel from the administrative spreadsheet (creates/updates by national_id).
• POST /api/teams; GET /api/teams
• POST /api/players
• POST /api/matches; GET /api/matches
• PUT /api/matches/{id}/lineup → bulk upsert of `match_players` (starters/subs, optional jersey numbers). Player key: Documento_de_Identidad (int)
• PUT /api/matches/{id}/events → bulk upsert of events. Player fields use Documento_de_Identidad (int)
• POST /api/matches/{id}/confirm → lock the match after admin review.
• POST /api/upload_pdf → idempotent by `source_pdf_hash`; returns existing draft if already uploaded.
• GET /api/uploads/{id}/status → poll background parse/OCR job status.

12.1 Endpoint contracts (examples)

• POST /api/teams
Request:
```json
{ "name": "Nacional U19", "category": "Sub 19" }
```
Response 200:
```json
{ "team_id": "uuid", "name": "Nacional U19", "category": "Sub 19" }
```

• GET /api/teams
Response 200:
```json
[
  { "team_id": "uuid", "name": "Juventud U19", "category": "Sub 19" },
  { "team_id": "uuid", "name": "Nacional U19", "category": "Sub 19" }
]
```

• POST /api/players
Request:
```json
{
  "full_name": "Juan Pérez",
  "national_id": "12345678",
  "birthdate": "2006-03-01",
  "current_team_id": "uuid",
  "position": "MF"
}
```
Response 200:
```json
{
  "player_id": "uuid",
  "full_name": "Juan Pérez",
  "national_id": "12345678",
  "birthdate": "2006-03-01",
  "current_team_id": "uuid",
  "position": "MF",
  "active": true
}
```

• GET /api/players?search=Juan (reads from administrativo)
Response 200:
```json
[
  { "player_id": "uuid", "full_name": "Juan Pérez", "national_id": "12345678", "current_team_id": "uuid", "position": "MF", "active": true }
]
```

• POST /api/matches
Request:
```json
{
  "competition_id": "uuid",
  "match_date": "2025-09-11T20:00:00Z",
  "venue_id": "uuid",
  "category": "Sub 19",
  "home_team_id": "uuid",
  "away_team_id": "uuid",
  "youtube_link": null,
  "notes": "parsed from PDF",
  "source_pdf_hash": "sha256:..."
}
```
Response 200:
```json
{
  "match_id": "uuid",
  "competition_id": "uuid",
  "match_date": "2025-09-11T20:00:00Z",
  "venue_id": "uuid",
  "category": "Sub 19",
  "home_team_id": "uuid",
  "away_team_id": "uuid",
  "result_home": 0,
  "result_away": 0,
  "youtube_link": null,
  "notes": "parsed from PDF",
  "source_pdf_hash": "sha256:...",
  "parse_confidence": null
}
```

• PUT /api/matches/{id}/lineup (Documento_de_Identidad)
Request:
```json
[
  { "player_id": 12345678, "team_id": "uuid", "role": "starter", "position": "MF", "jersey_number": null },
  { "player_id": 87654321, "team_id": "uuid", "role": "sub", "position": "FW", "jersey_number": null }
]
```
Response 200:
```json
{ "status": "ok" }
```

• PUT /api/matches/{id}/events (Documento_de_Identidad)
Request (event_type enum values: goal|pen_goal|own_goal|yellow|second_yellow|red|sub_on|sub_off):
```json
[
  { "team_id": "uuid", "player_id": 12345678, "minute": 12, "added_time": null, "type": "goal", "assist_player_id": null },
  { "team_id": "uuid", "player_id": 12345678, "related_player_id": 87654321, "minute": 60, "type": "sub_off" },
  { "team_id": "uuid", "player_id": 87654321, "minute": 60, "type": "sub_on" }
]
```
Response 200:
```json
{ "status": "ok" }
```

• POST /api/matches/{id}/confirm
Response 200:
```json
{ "status": "ok", "match": { "match_id": "uuid", "parse_confidence": 1.0, "result_home": 0, "result_away": 0, "home_team_id": "uuid", "away_team_id": "uuid" } }
```

• POST /api/upload_pdf (planned)
Request: multipart/form-data with fields `file` (PDF) and optional `source_pdf_hash`.
Response 200:
```json
{ "match_id": "uuid", "status": "draft_created", "parse_confidence": 0.42 }
```
Idempotency: same `source_pdf_hash` returns existing draft.

• GET /api/uploads/{id}/status (planned)
Response 200:
```json
{ "upload_id": "uuid", "state": "processing", "progress": 65 }
```

⸻

13. PDF ingestion details

• Detection: If no extractable text is found, render pages to images and run OCR.
• OCR: Tesseract-based (e.g., via leptess) or a cloud OCR; post-process with normalization (diacritics, casing, whitespace) and fuzzy matching against players by full_name and national_id.
• Templates: Heuristics for AUF-style layouts (headers, lineups, events tables) with tolerance for formatting variance.
• Confidence: Compute per-field confidence and persist in parsed JSON; drive UI review order.
• Artifacts: Store original PDF and parsed JSON alongside DB records for traceability.

⸻

14. Admin UI refinements

• Spreadsheet-driven identity: Import tool and player autocomplete by national_id/name; quick-add unknowns inline during match editing.
• Confidence-driven review: Sort fields/events by lowest confidence; side-by-side diff of parsed vs. edited values.
• QoL: Keyboard-friendly editing, bulk event entry, validations (starters count, card/sub rules), and Spanish labels.