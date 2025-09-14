#!/usr/bin/env bash
set -euo pipefail

API=${API:-http://localhost:8000}
JQ=${JQ:-jq}

say() { printf "\n=== %s ===\n" "$*"; }
err() { printf "[ERROR] %s\n" "$*" >&2; }

# 0) Health
say "Health"
if ! curl -sS "$API/" | cat; then err "API not reachable at $API"; exit 1; fi

# 1) Teams
say "Teams (GET /api/teams)"
TEAMS=$(curl -sS "$API/api/teams")
printf "%s\n" "$TEAMS" | $JQ .
TEAM_COUNT=$(printf "%s\n" "$TEAMS" | $JQ 'length')
say "Team count: $TEAM_COUNT"

# 2) Matches
say "Matches (GET /api/matches)"
MATCHES=$(curl -sS "$API/api/matches")
printf "%s\n" "$MATCHES" | $JQ .
MATCH_COUNT=$(printf "%s\n" "$MATCHES" | $JQ 'length')
say "Match count: $MATCH_COUNT"

if [ "$MATCH_COUNT" -eq 0 ]; then
  err "No matches found. Exiting."
  exit 0
fi

# 3) Pick first match id, show summary
MID=$(printf "%s\n" "$MATCHES" | $JQ -r '.[0].match_id')
HOME=$(printf "%s\n" "$MATCHES" | $JQ -r '.[0].home_team_id')
AWAY=$(printf "%s\n" "$MATCHES" | $JQ -r '.[0].away_team_id')
DATE=$(printf "%s\n" "$MATCHES" | $JQ -r '.[0].match_date')
CONF=$(printf "%s\n" "$MATCHES" | $JQ -r '.[0].parse_confidence')
say "Selected MATCH_ID=$MID | date=$DATE | parse_confidence=${CONF:-null}"

# 4) Lineup
say "Lineup (GET /api/matches/{id}/lineup)"
LINEUP=$(curl -sS "$API/api/matches/$MID/lineup")
printf "%s\n" "$LINEUP" | $JQ .
LINEUP_COUNT=$(printf "%s\n" "$LINEUP" | $JQ '.lineup | length')
say "Lineup entries: $LINEUP_COUNT (starters first)"

# 5) Events
say "Events (GET /api/matches/{id}/events)"
EVENTS=$(curl -sS "$API/api/matches/$MID/events")
printf "%s\n" "$EVENTS" | $JQ .
EVENT_COUNT=$(printf "%s\n" "$EVENTS" | $JQ '.events | length')
say "Events: $EVENT_COUNT"

# 6) Players directory (search-only)
say "Players search: Juan (GET /api/players?search=Juan)"
PLAYERS=$(curl -sS "$API/api/players?search=Juan")
printf "%s\n" "$PLAYERS" | $JQ '.[0:10]'
PLAYER_COUNT=$(printf "%s\n" "$PLAYERS" | $JQ 'length')
say "Players matched: $PLAYER_COUNT (showing up to 10)"


API=http://localhost:8000
MID=$(curl -s $API/api/matches | jq -r '.[0].match_id')
curl -s "$API/api/matches/$MID/lineup" | jq .
curl -s "$API/api/matches/$MID/subs" | jq .