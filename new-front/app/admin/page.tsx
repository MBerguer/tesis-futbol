"use client";

import React from "react";

type Competition = {
  competition_id: string;
  name: string;
  season?: string | null;
};
type Venue = {
  venue_id: string;
  name: string;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};
type Team = { team_id: string; name: string; category?: string | null };
type AdminMatch = {
  match_id: string;
  match_date: string;
  home_team_id: string;
  away_team_id: string;
  venue_id?: string | null;
  competition_id?: string | null;
  category?: string | null;
  result_home: number;
  result_away: number;
  youtube_link?: string | null;
  notes?: string | null;
  gps_table_name?: string | null;
  home_team_name?: string | null;
  away_team_name?: string | null;
};

type MatchPlayer = {
  match_player_id: string;
  match_id: string;
  team_id: string;
  team_name: string;
  player_id: number;
  jugador?: string | null;
  nombre?: string | null;
  role: string;
  position?: string | null;
  jersey_number?: number | null;
};

type Player = {
  documento_de_identidad: number;
  jugador?: string | null;
  nombre?: string | null;
  posicion?: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AdminPage() {
  const [competitions, setCompetitions] = React.useState<Competition[]>([]);
  const [venues, setVenues] = React.useState<Venue[]>([]);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<boolean>(false);

  const [editingCompetitionId, setEditingCompetitionId] = React.useState<
    string | null
  >(null);
  const [compForm, setCompForm] = React.useState<Partial<Competition>>({});
  const [newComp, setNewComp] = React.useState<Partial<Competition>>({
    name: "",
    season: "",
  });

  const [editingVenueId, setEditingVenueId] = React.useState<string | null>(
    null
  );
  const [venueForm, setVenueForm] = React.useState<Partial<Venue>>({});
  const [newVenue, setNewVenue] = React.useState<Partial<Venue>>({
    name: "",
    city: "",
    latitude: undefined,
    longitude: undefined,
  });

  const [editingTeamId, setEditingTeamId] = React.useState<string | null>(null);
  const [teamForm, setTeamForm] = React.useState<Partial<Team>>({});
  const [newTeam, setNewTeam] = React.useState<Partial<Team>>({
    name: "",
    category: "",
  });

  const [matches, setMatches] = React.useState<AdminMatch[]>([]);
  const [editingMatchId, setEditingMatchId] = React.useState<string | null>(
    null
  );
  const [matchForm, setMatchForm] = React.useState<Partial<AdminMatch>>({});
  const [newMatch, setNewMatch] = React.useState<Partial<AdminMatch>>({
    match_date: "",
    home_team_id: "",
    away_team_id: "",
    venue_id: "",
    competition_id: "",
    category: "",
    result_home: 0,
    result_away: 0,
    youtube_link: "",
    notes: "",
  });

  // Match Players state
  const [matchPlayers, setMatchPlayers] = React.useState<MatchPlayer[]>([]);
  const [players, setPlayers] = React.useState<Player[]>([]);
  const [selectedMatchId, setSelectedMatchId] = React.useState<string | null>(
    null
  );
  const [editingMatchPlayerId, setEditingMatchPlayerId] = React.useState<
    string | null
  >(null);
  const [matchPlayerForm, setMatchPlayerForm] = React.useState<
    Partial<MatchPlayer>
  >({});
  const [newMatchPlayer, setNewMatchPlayer] = React.useState<
    Partial<MatchPlayer>
  >({
    match_id: "",
    team_id: "",
    player_id: 0,
    role: "starter",
    position: "",
    jersey_number: undefined,
  });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [c, v, t, m, p] = await Promise.all([
          fetch(`${API_BASE}/api/competitions`).then((r) => r.json()),
          fetch(`${API_BASE}/api/venues`).then((r) => r.json()),
          fetch(`${API_BASE}/api/teams`).then((r) => r.json()),
          fetch(`${API_BASE}/api/matches`).then((r) => r.json()),
          fetch(`${API_BASE}/api/players?search=`).then((r) => r.json()),
        ]);
        if (!cancelled) {
          setCompetitions(Array.isArray(c) ? c : []);
          setVenues(Array.isArray(v) ? v : []);
          setTeams(Array.isArray(t) ? t : []);
          setMatches(Array.isArray(m) ? m : []);
          setPlayers(Array.isArray(p) ? p : []);
        }
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshAll() {
    setLoading(true);
    setError(null);
    try {
      const [c, v, t, m, p] = await Promise.all([
        fetch(`${API_BASE}/api/competitions`).then((r) => r.json()),
        fetch(`${API_BASE}/api/venues`).then((r) => r.json()),
        fetch(`${API_BASE}/api/teams`).then((r) => r.json()),
        fetch(`${API_BASE}/api/matches`).then((r) => r.json()),
        fetch(`${API_BASE}/api/players?search=`).then((r) => r.json()),
      ]);
      setCompetitions(Array.isArray(c) ? c : []);
      setVenues(Array.isArray(v) ? v : []);
      setTeams(Array.isArray(t) ? t : []);
      setMatches(Array.isArray(m) ? m : []);
      setPlayers(Array.isArray(p) ? p : []);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function createCompetition() {
    if (!newComp.name) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/competitions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newComp.name,
          season: newComp.season || null,
        }),
      });
      setNewComp({ name: "", season: "" });
      await refreshAll();
    } finally {
      setSaving(false);
    }
  }

  async function saveCompetition(id: string) {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/competitions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competition_id: id,
          name: compForm.name,
          season: compForm.season || null,
        }),
      });
      setEditingCompetitionId(null);
      setCompForm({});
      await refreshAll();
    } finally {
      setSaving(false);
    }
  }

  async function deleteCompetition(id: string) {
    if (!confirm("Delete competition?")) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/competitions/${id}`, { method: "DELETE" });
      await refreshAll();
    } finally {
      setSaving(false);
    }
  }

  async function createVenue() {
    if (!newVenue.name) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/venues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newVenue.name,
          city: newVenue.city || null,
          latitude: newVenue.latitude ?? null,
          longitude: newVenue.longitude ?? null,
          venue_id: null,
        }),
      });
      setNewVenue({
        name: "",
        city: "",
        latitude: undefined,
        longitude: undefined,
      });
      await refreshAll();
    } finally {
      setSaving(false);
    }
  }

  async function saveVenue(id: string) {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/venues/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue_id: id,
          name: venueForm.name,
          city: venueForm.city || null,
          latitude:
            venueForm.latitude === undefined ? null : venueForm.latitude,
          longitude:
            venueForm.longitude === undefined ? null : venueForm.longitude,
        }),
      });
      setEditingVenueId(null);
      setVenueForm({});
      await refreshAll();
    } finally {
      setSaving(false);
    }
  }

  async function deleteVenue(id: string) {
    if (!confirm("Delete venue?")) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/venues/${id}`, { method: "DELETE" });
      await refreshAll();
    } finally {
      setSaving(false);
    }
  }

  async function createTeam() {
    if (!newTeam.name) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: null,
          name: newTeam.name,
          category: newTeam.category || null,
        }),
      });
      setNewTeam({ name: "", category: "" });
      await refreshAll();
    } finally {
      setSaving(false);
    }
  }

  async function saveTeam(id: string) {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/teams/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: id,
          name: teamForm.name,
          category: teamForm.category || null,
        }),
      });
      setEditingTeamId(null);
      setTeamForm({});
      await refreshAll();
    } finally {
      setSaving(false);
    }
  }

  async function deleteTeam(id: string) {
    if (!confirm("Delete team?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/teams/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "Failed to delete team");
        setError(msg || "Failed to delete team");
        alert(`Could not delete team: ${msg}`);
        return;
      }
      await refreshAll();
    } catch (e: any) {
      const msg = String(e?.message || e);
      setError(msg);
      alert(`Could not delete team: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  function toIsoUtcFromLocal(local: string): string | null {
    if (!local) return null;
    const d = new Date(local);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  async function createMatch() {
    if (
      !newMatch.home_team_id ||
      !newMatch.away_team_id ||
      !newMatch.match_date
    )
      return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competition_id: newMatch.competition_id || null,
          match_date: toIsoUtcFromLocal(newMatch.match_date as string),
          venue_id: newMatch.venue_id || null,
          category: newMatch.category || null,
          home_team_id: newMatch.home_team_id,
          away_team_id: newMatch.away_team_id,
          youtube_link: newMatch.youtube_link || null,
          notes: newMatch.notes || null,
          source_pdf_hash: null,
        }),
      });
      setNewMatch({
        match_date: "",
        home_team_id: "",
        away_team_id: "",
        venue_id: "",
        competition_id: "",
        category: "",
        result_home: 0,
        result_away: 0,
        youtube_link: "",
        notes: "",
      });
      await refreshAll();
    } finally {
      setSaving(false);
    }
  }

  async function saveMatch(id: string) {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/matches/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competition_id: matchForm.competition_id ?? undefined,
          match_date: matchForm.match_date
            ? toIsoUtcFromLocal(matchForm.match_date as string)
            : undefined,
          venue_id: matchForm.venue_id ?? undefined,
          category: matchForm.category ?? undefined,
          home_team_id: matchForm.home_team_id ?? undefined,
          away_team_id: matchForm.away_team_id ?? undefined,
          result_home: matchForm.result_home ?? undefined,
          result_away: matchForm.result_away ?? undefined,
          youtube_link: matchForm.youtube_link ?? undefined,
          notes: matchForm.notes ?? undefined,
          gps_table_name: matchForm.gps_table_name ?? undefined,
        }),
      });
      setEditingMatchId(null);
      setMatchForm({});
      await refreshAll();
    } finally {
      setSaving(false);
    }
  }

  async function deleteMatch(id: string) {
    if (!confirm("Delete match?")) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/matches/${id}`, { method: "DELETE" });
      await refreshAll();
    } finally {
      setSaving(false);
    }
  }

  // Match Players functions
  async function loadMatchPlayers(matchId: string) {
    try {
      const response = await fetch(
        `${API_BASE}/api/matches/${matchId}/players`
      );
      const data = await response.json();
      setMatchPlayers(data.match_players || []);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }

  async function createMatchPlayer() {
    if (
      !newMatchPlayer.match_id ||
      !newMatchPlayer.team_id ||
      !newMatchPlayer.player_id
    )
      return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/match-players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: newMatchPlayer.match_id,
          team_id: newMatchPlayer.team_id,
          player_id: newMatchPlayer.player_id,
          role: newMatchPlayer.role,
          position: newMatchPlayer.position || null,
          jersey_number: newMatchPlayer.jersey_number || null,
        }),
      });
      setNewMatchPlayer({
        match_id: "",
        team_id: "",
        player_id: 0,
        role: "starter",
        position: "",
        jersey_number: undefined,
      });
      if (selectedMatchId) {
        await loadMatchPlayers(selectedMatchId);
      }
    } finally {
      setSaving(false);
    }
  }

  async function updateMatchPlayer(id: string) {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/match-players/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: matchPlayerForm.role,
          position: matchPlayerForm.position || null,
          jersey_number: matchPlayerForm.jersey_number || null,
        }),
      });
      setEditingMatchPlayerId(null);
      setMatchPlayerForm({});
      if (selectedMatchId) {
        await loadMatchPlayers(selectedMatchId);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteMatchPlayer(id: string) {
    if (!confirm("Delete match player?")) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/match-players/${id}`, { method: "DELETE" });
      if (selectedMatchId) {
        await loadMatchPlayers(selectedMatchId);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <h1 className="text-2xl font-semibold mb-4">Admin</h1>
      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Competitions</h2>
        <div className="mb-3 flex gap-2 items-end">
          <div>
            <label className="block text-xs text-muted-foreground">Name</label>
            <input
              value={newComp.name || ""}
              onChange={(e) =>
                setNewComp((s) => ({ ...s, name: e.target.value }))
              }
              className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground">
              Season
            </label>
            <input
              value={newComp.season || ""}
              onChange={(e) =>
                setNewComp((s) => ({ ...s, season: e.target.value }))
              }
              className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
            />
          </div>
          <button
            disabled={saving}
            onClick={createCompetition}
            className="h-9 px-3 rounded border border-border hover:border-ring bg-card text-foreground"
          >
            Add
          </button>
        </div>
        <div className="space-y-2">
          {competitions.map((c) => (
            <div
              key={c.competition_id}
              className="border border-border rounded p-3 flex items-center gap-3 bg-card"
            >
              {editingCompetitionId === c.competition_id ? (
                <>
                  <input
                    defaultValue={c.name}
                    onChange={(e) =>
                      setCompForm((s) => ({ ...s, name: e.target.value }))
                    }
                    className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground flex-1"
                  />
                  <input
                    defaultValue={c.season || ""}
                    onChange={(e) =>
                      setCompForm((s) => ({ ...s, season: e.target.value }))
                    }
                    className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground w-32"
                  />
                  <button
                    disabled={saving}
                    onClick={() => saveCompetition(c.competition_id)}
                    className="h-9 px-3 rounded border border-border bg-card text-foreground hover:bg-accent"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingCompetitionId(null);
                      setCompForm({});
                    }}
                    className="h-9 px-3 rounded border border-border bg-card text-foreground hover:bg-accent"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Season: {c.season || "—"}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingCompetitionId(c.competition_id);
                      setCompForm({ name: c.name, season: c.season });
                    }}
                    className="h-8 px-2 rounded border border-border bg-card text-foreground hover:bg-accent"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteCompetition(c.competition_id)}
                    className="h-8 px-2 rounded border border-red-900 text-red-300 hover:border-red-700"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Venues</h2>
        <div className="mb-3 grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
          <input
            placeholder="Name"
            value={newVenue.name || ""}
            onChange={(e) =>
              setNewVenue((s) => ({ ...s, name: e.target.value }))
            }
            className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
          />
          <input
            placeholder="City"
            value={newVenue.city || ""}
            onChange={(e) =>
              setNewVenue((s) => ({ ...s, city: e.target.value }))
            }
            className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
          />
          <input
            placeholder="Latitude"
            value={newVenue.latitude ?? ""}
            onChange={(e) =>
              setNewVenue((s) => ({
                ...s,
                latitude:
                  e.target.value === "" ? undefined : Number(e.target.value),
              }))
            }
            className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
          />
          <input
            placeholder="Longitude"
            value={newVenue.longitude ?? ""}
            onChange={(e) =>
              setNewVenue((s) => ({
                ...s,
                longitude:
                  e.target.value === "" ? undefined : Number(e.target.value),
              }))
            }
            className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
          />
          <button
            disabled={saving}
            onClick={createVenue}
            className="h-9 px-3 rounded border border-border bg-card text-foreground hover:bg-accent"
          >
            Add
          </button>
        </div>
        <div className="space-y-2">
          {venues.map((v) => (
            <div
              key={v.venue_id}
              className="border border-border rounded p-3 bg-card"
            >
              {editingVenueId === v.venue_id ? (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                  <input
                    defaultValue={v.name}
                    onChange={(e) =>
                      setVenueForm((s) => ({ ...s, name: e.target.value }))
                    }
                    className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
                  />
                  <input
                    defaultValue={v.city || ""}
                    onChange={(e) =>
                      setVenueForm((s) => ({ ...s, city: e.target.value }))
                    }
                    className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
                  />
                  <input
                    defaultValue={v.latitude ?? ""}
                    onChange={(e) =>
                      setVenueForm((s) => ({
                        ...s,
                        latitude:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      }))
                    }
                    className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
                  />
                  <input
                    defaultValue={v.longitude ?? ""}
                    onChange={(e) =>
                      setVenueForm((s) => ({
                        ...s,
                        longitude:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      }))
                    }
                    className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={saving}
                      onClick={() => saveVenue(v.venue_id)}
                      className="h-9 px-3 rounded border border-border bg-card text-foreground hover:bg-accent"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingVenueId(null);
                        setVenueForm({});
                      }}
                      className="h-9 px-3 rounded border border-border bg-card text-foreground hover:bg-accent"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-medium">{v.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {v.city || "—"}{" "}
                      {typeof v.latitude === "number" &&
                      typeof v.longitude === "number"
                        ? `· (${v.latitude.toFixed(5)}, ${v.longitude.toFixed(
                            5
                          )})`
                        : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingVenueId(v.venue_id);
                      setVenueForm({
                        name: v.name,
                        city: v.city,
                        latitude: v.latitude,
                        longitude: v.longitude,
                      });
                    }}
                    className="h-8 px-2 rounded border border-border bg-card text-foreground hover:bg-accent"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteVenue(v.venue_id)}
                    className="h-8 px-2 rounded border border-red-900 text-red-300 hover:border-red-700"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Teams</h2>
        <div className="mb-3 flex gap-2 items-end">
          <div>
            <label className="block text-xs text-muted-foreground">Name</label>
            <input
              value={newTeam.name || ""}
              onChange={(e) =>
                setNewTeam((s) => ({ ...s, name: e.target.value }))
              }
              className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground">
              Category
            </label>
            <input
              value={newTeam.category || ""}
              onChange={(e) =>
                setNewTeam((s) => ({ ...s, category: e.target.value }))
              }
              className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
            />
          </div>
          <button
            disabled={saving}
            onClick={createTeam}
            className="h-9 px-3 rounded border border-border bg-card text-foreground hover:bg-accent"
          >
            Add
          </button>
        </div>
        <div className="space-y-2">
          {teams.map((t) => (
            <div
              key={t.team_id}
              className="border border-border rounded p-3 flex items-center gap-3 bg-card"
            >
              {editingTeamId === t.team_id ? (
                <>
                  <input
                    defaultValue={t.name}
                    onChange={(e) =>
                      setTeamForm((s) => ({ ...s, name: e.target.value }))
                    }
                    className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground flex-1"
                  />
                  <input
                    defaultValue={t.category || ""}
                    onChange={(e) =>
                      setTeamForm((s) => ({ ...s, category: e.target.value }))
                    }
                    className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground w-40"
                  />
                  <button
                    disabled={saving}
                    onClick={() => saveTeam(t.team_id)}
                    className="h-9 px-3 rounded border border-border bg-card text-foreground hover:bg-accent"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingTeamId(null);
                      setTeamForm({});
                    }}
                    className="h-9 px-3 rounded border border-border bg-card text-foreground hover:bg-accent"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      <span>{t.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {t.team_id.slice(0, 4)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t.category || "—"}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingTeamId(t.team_id);
                      setTeamForm({ name: t.name, category: t.category });
                    }}
                    className="h-8 px-2 rounded border border-border bg-card text-foreground hover:bg-accent"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTeam(t.team_id)}
                    className="h-8 px-2 rounded border border-red-900 text-red-300 hover:border-red-700"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Matches</h2>
        <div className="mb-3 grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
          <input
            type="datetime-local"
            value={(newMatch.match_date as string) || ""}
            onChange={(e) =>
              setNewMatch((s) => ({ ...s, match_date: e.target.value }))
            }
            className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
          />
          <select
            value={(newMatch.home_team_id as string) || ""}
            onChange={(e) =>
              setNewMatch((s) => ({ ...s, home_team_id: e.target.value }))
            }
            className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
          >
            <option value="">Home team</option>
            {teams.map((t) => (
              <option key={t.team_id} value={t.team_id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            value={(newMatch.away_team_id as string) || ""}
            onChange={(e) =>
              setNewMatch((s) => ({ ...s, away_team_id: e.target.value }))
            }
            className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
          >
            <option value="">Away team</option>
            {teams.map((t) => (
              <option key={t.team_id} value={t.team_id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            value={(newMatch.venue_id as string) || ""}
            onChange={(e) =>
              setNewMatch((s) => ({ ...s, venue_id: e.target.value }))
            }
            className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
          >
            <option value="">Venue</option>
            {venues.map((v) => (
              <option key={v.venue_id} value={v.venue_id}>
                {v.name}
              </option>
            ))}
          </select>
          <select
            value={(newMatch.competition_id as string) || ""}
            onChange={(e) =>
              setNewMatch((s) => ({ ...s, competition_id: e.target.value }))
            }
            className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
          >
            <option value="">Competition</option>
            {competitions.map((c) => (
              <option key={c.competition_id} value={c.competition_id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            disabled={saving}
            onClick={createMatch}
            className="h-9 px-3 rounded border border-border bg-card text-foreground hover:bg-accent"
          >
            Add
          </button>
        </div>
        <div className="space-y-2">
          {matches.map((m) => (
            <div
              key={m.match_id}
              className="border border-border rounded p-3 bg-card"
            >
              {editingMatchId === m.match_id ? (
                <div className="grid grid-cols-1 md:grid-cols-9 gap-2 items-center">
                  <input
                    type="datetime-local"
                    defaultValue={m.match_date?.slice(0, 16)}
                    onChange={(e) =>
                      setMatchForm((s) => ({
                        ...s,
                        match_date: e.target.value,
                      }))
                    }
                    className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
                  />
                  <select
                    defaultValue={m.home_team_id}
                    onChange={(e) =>
                      setMatchForm((s) => ({
                        ...s,
                        home_team_id: e.target.value,
                      }))
                    }
                    className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
                  >
                    {teams.map((t) => (
                      <option key={t.team_id} value={t.team_id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <select
                    defaultValue={m.away_team_id}
                    onChange={(e) =>
                      setMatchForm((s) => ({
                        ...s,
                        away_team_id: e.target.value,
                      }))
                    }
                    className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
                  >
                    {teams.map((t) => (
                      <option key={t.team_id} value={t.team_id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <select
                    defaultValue={m.venue_id || ""}
                    onChange={(e) =>
                      setMatchForm((s) => ({ ...s, venue_id: e.target.value }))
                    }
                    className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
                  >
                    <option value="">Venue</option>
                    {venues.map((v) => (
                      <option key={v.venue_id} value={v.venue_id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Category"
                    defaultValue={m.category || ""}
                    onChange={(e) =>
                      setMatchForm((s) => ({ ...s, category: e.target.value }))
                    }
                    className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
                  />
                  <input
                    placeholder="YouTube"
                    defaultValue={m.youtube_link || ""}
                    onChange={(e) =>
                      setMatchForm((s) => ({
                        ...s,
                        youtube_link: e.target.value,
                      }))
                    }
                    className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
                  />
                  <input
                    placeholder="Notes"
                    defaultValue={m.notes || ""}
                    onChange={(e) =>
                      setMatchForm((s) => ({ ...s, notes: e.target.value }))
                    }
                    className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
                  />
                  <input
                    placeholder="GPS table"
                    defaultValue={m.gps_table_name || ""}
                    onChange={(e) =>
                      setMatchForm((s) => ({
                        ...s,
                        gps_table_name: e.target.value,
                      }))
                    }
                    className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={saving}
                      onClick={() => saveMatch(m.match_id)}
                      className="h-9 px-3 rounded border border-border bg-card text-foreground hover:bg-accent"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingMatchId(null);
                        setMatchForm({});
                      }}
                      className="h-9 px-3 rounded border border-border bg-card text-foreground hover:bg-accent"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-medium">
                      {m.home_team_name || m.home_team_id.slice(0, 6)} vs{" "}
                      {m.away_team_name || m.away_team_id.slice(0, 6)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(m.match_date).toLocaleString()} · Result{" "}
                      {m.result_home}-{m.result_away}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingMatchId(m.match_id);
                      setMatchForm({});
                    }}
                    className="h-8 px-2 rounded border border-border bg-card text-foreground hover:bg-accent"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteMatch(m.match_id)}
                    className="h-8 px-2 rounded border border-red-900 text-red-300 hover:border-red-700"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Match Players</h2>

        {/* Match Selection */}
        <div className="mb-4">
          <label className="block text-sm text-muted-foreground mb-2">
            Select Match
          </label>
          <select
            value={selectedMatchId || ""}
            onChange={(e) => {
              const matchId = e.target.value;
              setSelectedMatchId(matchId);
              if (matchId) {
                loadMatchPlayers(matchId);
                setNewMatchPlayer((prev) => ({ ...prev, match_id: matchId }));
              } else {
                setMatchPlayers([]);
              }
            }}
            className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground w-full max-w-md"
          >
            <option value="">Select a match...</option>
            {matches
              .sort(
                (a, b) =>
                  new Date(b.match_date).getTime() -
                  new Date(a.match_date).getTime()
              )
              .map((m) => (
                <option key={m.match_id} value={m.match_id}>
                  {m.home_team_name || m.home_team_id.slice(0, 6)} vs{" "}
                  {m.away_team_name || m.away_team_id.slice(0, 6)} -{" "}
                  {new Date(m.match_date).toLocaleDateString()}
                </option>
              ))}
          </select>
        </div>

        {selectedMatchId && (
          <>
            {/* Add New Match Player */}
            <div className="mb-4 p-4 border border-border rounded bg-card">
              <h3 className="text-md font-medium mb-3">Add Player to Match</h3>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                <select
                  value={newMatchPlayer.team_id || ""}
                  onChange={(e) =>
                    setNewMatchPlayer((prev) => ({
                      ...prev,
                      team_id: e.target.value,
                    }))
                  }
                  className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
                >
                  <option value="">Team</option>
                  {teams.map((t) => (
                    <option key={t.team_id} value={t.team_id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <select
                  value={newMatchPlayer.player_id || ""}
                  onChange={(e) =>
                    setNewMatchPlayer((prev) => ({
                      ...prev,
                      player_id: Number(e.target.value),
                    }))
                  }
                  className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
                >
                  <option value="">Player</option>
                  {players
                    .sort((a, b) => {
                      const nameA = (
                        a.jugador || `Player ${a.documento_de_identidad}`
                      ).toLowerCase();
                      const nameB = (
                        b.jugador ||
                        b.nombre ||
                        `Player ${b.documento_de_identidad}`
                      ).toLowerCase();
                      return nameA.localeCompare(nameB);
                    })
                    .map((p) => (
                      <option
                        key={p.documento_de_identidad}
                        value={p.documento_de_identidad}
                      >
                        {p.jugador ||
                          p.nombre ||
                          `Player ${p.documento_de_identidad}`}
                      </option>
                    ))}
                </select>
                <select
                  value={newMatchPlayer.role || "starter"}
                  onChange={(e) =>
                    setNewMatchPlayer((prev) => ({
                      ...prev,
                      role: e.target.value,
                    }))
                  }
                  className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
                >
                  <option value="starter">Starter</option>
                  <option value="sub">Substitute</option>
                </select>
                <input
                  placeholder="Position"
                  value={newMatchPlayer.position || ""}
                  onChange={(e) =>
                    setNewMatchPlayer((prev) => ({
                      ...prev,
                      position: e.target.value,
                    }))
                  }
                  className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
                />
                <input
                  type="number"
                  placeholder="Jersey #"
                  value={newMatchPlayer.jersey_number || ""}
                  onChange={(e) =>
                    setNewMatchPlayer((prev) => ({
                      ...prev,
                      jersey_number: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                  className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
                />
                <button
                  disabled={saving}
                  onClick={createMatchPlayer}
                  className="h-9 px-3 rounded border border-border bg-card text-foreground hover:bg-accent"
                >
                  Add Player
                </button>
              </div>
            </div>

            {/* Match Players List */}
            <div className="space-y-2">
              <h3 className="text-md font-medium">Players in Match</h3>
              {matchPlayers.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 border border-border rounded bg-card">
                  No players added to this match yet.
                </div>
              ) : (
                matchPlayers.map((mp) => (
                  <div
                    key={mp.match_player_id}
                    className="border border-border rounded p-3 bg-card"
                  >
                    {editingMatchPlayerId === mp.match_player_id ? (
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                        <select
                          defaultValue={mp.role}
                          onChange={(e) =>
                            setMatchPlayerForm((prev) => ({
                              ...prev,
                              role: e.target.value,
                            }))
                          }
                          className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
                        >
                          <option value="starter">Starter</option>
                          <option value="sub">Substitute</option>
                        </select>
                        <input
                          placeholder="Position"
                          defaultValue={mp.position || ""}
                          onChange={(e) =>
                            setMatchPlayerForm((prev) => ({
                              ...prev,
                              position: e.target.value,
                            }))
                          }
                          className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
                        />
                        <input
                          type="number"
                          placeholder="Jersey #"
                          defaultValue={mp.jersey_number || ""}
                          onChange={(e) =>
                            setMatchPlayerForm((prev) => ({
                              ...prev,
                              jersey_number: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            }))
                          }
                          className="h-9 rounded bg-background border border-input px-2 text-sm text-foreground"
                        />
                        <div className="flex gap-2">
                          <button
                            disabled={saving}
                            onClick={() =>
                              updateMatchPlayer(mp.match_player_id)
                            }
                            className="h-9 px-3 rounded border border-border bg-card text-foreground hover:bg-accent"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingMatchPlayerId(null);
                              setMatchPlayerForm({});
                            }}
                            className="h-9 px-3 rounded border border-border bg-card text-foreground hover:bg-accent"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="font-medium">
                            {mp.jugador ||
                              mp.nombre ||
                              `Player ${mp.player_id}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {mp.team_name} · {mp.role} ·{" "}
                            {mp.position || "No position"} · Jersey #
                            {mp.jersey_number || "—"}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setEditingMatchPlayerId(mp.match_player_id);
                            setMatchPlayerForm({
                              role: mp.role,
                              position: mp.position,
                              jersey_number: mp.jersey_number,
                            });
                          }}
                          className="h-8 px-2 rounded border border-border bg-card text-foreground hover:bg-accent"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteMatchPlayer(mp.match_player_id)}
                          className="h-8 px-2 rounded border border-red-900 text-red-300 hover:border-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
