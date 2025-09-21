"use client";

import React from "react";

type Competition = { competition_id: string; name: string; season?: string | null };
type Venue = { venue_id: string; name: string; city?: string | null; latitude?: number | null; longitude?: number | null };
type Team = { team_id: string; name: string; category?: string | null };
type AdminMatch = { match_id: string; match_date: string; home_team_id: string; away_team_id: string; venue_id?: string | null; competition_id?: string | null; category?: string | null; result_home: number; result_away: number; youtube_link?: string | null; notes?: string | null; gps_table_name?: string | null; home_team_name?: string | null; away_team_name?: string | null };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AdminPage() {
  const [competitions, setCompetitions] = React.useState<Competition[]>([]);
  const [venues, setVenues] = React.useState<Venue[]>([]);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<boolean>(false);

  const [editingCompetitionId, setEditingCompetitionId] = React.useState<string | null>(null);
  const [compForm, setCompForm] = React.useState<Partial<Competition>>({});
  const [newComp, setNewComp] = React.useState<Partial<Competition>>({ name: "", season: "" });

  const [editingVenueId, setEditingVenueId] = React.useState<string | null>(null);
  const [venueForm, setVenueForm] = React.useState<Partial<Venue>>({});
  const [newVenue, setNewVenue] = React.useState<Partial<Venue>>({ name: "", city: "", latitude: undefined, longitude: undefined });

  const [editingTeamId, setEditingTeamId] = React.useState<string | null>(null);
  const [teamForm, setTeamForm] = React.useState<Partial<Team>>({});
  const [newTeam, setNewTeam] = React.useState<Partial<Team>>({ name: "", category: "" });

  const [matches, setMatches] = React.useState<AdminMatch[]>([]);
  const [editingMatchId, setEditingMatchId] = React.useState<string | null>(null);
  const [matchForm, setMatchForm] = React.useState<Partial<AdminMatch>>({});
  const [newMatch, setNewMatch] = React.useState<Partial<AdminMatch>>({
    match_date: '',
    home_team_id: '',
    away_team_id: '',
    venue_id: '',
    competition_id: '',
    category: '',
    result_home: 0,
    result_away: 0,
    youtube_link: '',
    notes: ''
  });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [c, v, t, m] = await Promise.all([
          fetch(`${API_BASE}/api/competitions`).then(r=>r.json()),
          fetch(`${API_BASE}/api/venues`).then(r=>r.json()),
          fetch(`${API_BASE}/api/teams`).then(r=>r.json()),
          fetch(`${API_BASE}/api/matches`).then(r=>r.json()),
        ]);
        if (!cancelled) {
          setCompetitions(Array.isArray(c)?c:[]);
          setVenues(Array.isArray(v)?v:[]);
          setTeams(Array.isArray(t)?t:[]);
          setMatches(Array.isArray(m)?m:[]);
        }
      } catch (e:any) {
        if (!cancelled) setError(String(e?.message||e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function refreshAll() {
    setLoading(true);
    setError(null);
    try {
      const [c, v, t, m] = await Promise.all([
        fetch(`${API_BASE}/api/competitions`).then(r=>r.json()),
        fetch(`${API_BASE}/api/venues`).then(r=>r.json()),
        fetch(`${API_BASE}/api/teams`).then(r=>r.json()),
        fetch(`${API_BASE}/api/matches`).then(r=>r.json()),
      ]);
      setCompetitions(Array.isArray(c)?c:[]);
      setVenues(Array.isArray(v)?v:[]);
      setTeams(Array.isArray(t)?t:[]);
      setMatches(Array.isArray(m)?m:[]);
    } catch (e:any) {
      setError(String(e?.message||e));
    } finally {
      setLoading(false);
    }
  }

  async function createCompetition() {
    if (!newComp.name) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/competitions`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ name: newComp.name, season: newComp.season||null }) });
      setNewComp({ name: "", season: "" });
      await refreshAll();
    } finally { setSaving(false); }
  }

  async function saveCompetition(id: string) {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/competitions/${id}`, { method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ competition_id: id, name: compForm.name, season: compForm.season||null }) });
      setEditingCompetitionId(null); setCompForm({});
      await refreshAll();
    } finally { setSaving(false); }
  }

  async function deleteCompetition(id: string) {
    if (!confirm('Delete competition?')) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/competitions/${id}`, { method: 'DELETE' });
      await refreshAll();
    } finally { setSaving(false); }
  }

  async function createVenue() {
    if (!newVenue.name) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/venues`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ name: newVenue.name, city: newVenue.city||null, latitude: newVenue.latitude ?? null, longitude: newVenue.longitude ?? null, venue_id: null }) });
      setNewVenue({ name: "", city: "", latitude: undefined, longitude: undefined });
      await refreshAll();
    } finally { setSaving(false); }
  }

  async function saveVenue(id: string) {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/venues/${id}`, { method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ venue_id: id, name: venueForm.name, city: venueForm.city||null, latitude: (venueForm.latitude===undefined?null:venueForm.latitude), longitude: (venueForm.longitude===undefined?null:venueForm.longitude) }) });
      setEditingVenueId(null); setVenueForm({});
      await refreshAll();
    } finally { setSaving(false); }
  }

  async function deleteVenue(id: string) {
    if (!confirm('Delete venue?')) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/venues/${id}`, { method: 'DELETE' });
      await refreshAll();
    } finally { setSaving(false); }
  }

  async function createTeam() {
    if (!newTeam.name) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/teams`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ team_id: null, name: newTeam.name, category: newTeam.category||null }) });
      setNewTeam({ name: "", category: "" });
      await refreshAll();
    } finally { setSaving(false); }
  }

  async function saveTeam(id: string) {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/teams/${id}`, { method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ team_id: id, name: teamForm.name, category: teamForm.category||null }) });
      setEditingTeamId(null); setTeamForm({});
      await refreshAll();
    } finally { setSaving(false); }
  }

  async function deleteTeam(id: string) {
    if (!confirm('Delete team?')) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/teams/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const msg = await res.text().catch(() => 'Failed to delete team');
        setError(msg || 'Failed to delete team');
        alert(`Could not delete team: ${msg}`);
        return;
      }
      await refreshAll();
    } catch (e:any) {
      const msg = String(e?.message || e);
      setError(msg);
      alert(`Could not delete team: ${msg}`);
    } finally { setSaving(false); }
  }

  function toIsoUtcFromLocal(local: string): string | null {
    if (!local) return null;
    const d = new Date(local);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  async function createMatch() {
    if (!newMatch.home_team_id || !newMatch.away_team_id || !newMatch.match_date) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/matches`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({
        competition_id: newMatch.competition_id || null,
        match_date: toIsoUtcFromLocal(newMatch.match_date as string),
        venue_id: newMatch.venue_id || null,
        category: newMatch.category || null,
        home_team_id: newMatch.home_team_id,
        away_team_id: newMatch.away_team_id,
        youtube_link: newMatch.youtube_link || null,
        notes: newMatch.notes || null,
        source_pdf_hash: null
      }) });
      setNewMatch({ match_date: '', home_team_id: '', away_team_id: '', venue_id: '', competition_id: '', category: '', result_home: 0, result_away: 0, youtube_link: '', notes: '' });
      await refreshAll();
    } finally { setSaving(false); }
  }

  async function saveMatch(id: string) {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/matches/${id}`, { method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({
        competition_id: matchForm.competition_id ?? undefined,
        match_date: matchForm.match_date ? toIsoUtcFromLocal(matchForm.match_date as string) : undefined,
        venue_id: matchForm.venue_id ?? undefined,
        category: matchForm.category ?? undefined,
        home_team_id: matchForm.home_team_id ?? undefined,
        away_team_id: matchForm.away_team_id ?? undefined,
        result_home: matchForm.result_home ?? undefined,
        result_away: matchForm.result_away ?? undefined,
        youtube_link: matchForm.youtube_link ?? undefined,
        notes: matchForm.notes ?? undefined,
        gps_table_name: matchForm.gps_table_name ?? undefined,
      }) });
      setEditingMatchId(null); setMatchForm({});
      await refreshAll();
    } finally { setSaving(false); }
  }

  async function deleteMatch(id: string) {
    if (!confirm('Delete match?')) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/matches/${id}`, { method: 'DELETE' });
      await refreshAll();
    } finally { setSaving(false); }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <h1 className="text-2xl font-semibold mb-4">Admin</h1>
      {loading && <div className="text-sm text-zinc-400">Loading…</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Competitions</h2>
        <div className="mb-3 flex gap-2 items-end">
          <div>
            <label className="block text-xs text-zinc-400">Name</label>
            <input value={newComp.name||""} onChange={e=>setNewComp(s=>({...s, name: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400">Season</label>
            <input value={newComp.season||""} onChange={e=>setNewComp(s=>({...s, season: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm" />
          </div>
          <button disabled={saving} onClick={createCompetition} className="h-9 px-3 rounded border border-zinc-800 hover:border-zinc-700">Add</button>
        </div>
        <div className="space-y-2">
          {competitions.map(c => (
            <div key={c.competition_id} className="border border-zinc-800 rounded p-3 flex items-center gap-3">
              {editingCompetitionId === c.competition_id ? (
                <>
                  <input defaultValue={c.name} onChange={e=>setCompForm(s=>({...s, name: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm flex-1" />
                  <input defaultValue={c.season||""} onChange={e=>setCompForm(s=>({...s, season: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm w-32" />
                  <button disabled={saving} onClick={()=>saveCompetition(c.competition_id)} className="h-9 px-3 rounded border border-zinc-700">Save</button>
                  <button onClick={()=>{ setEditingCompetitionId(null); setCompForm({}); }} className="h-9 px-3 rounded border border-zinc-800">Cancel</button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-zinc-400">Season: {c.season || '—'}</div>
                  </div>
                  <button onClick={()=>{ setEditingCompetitionId(c.competition_id); setCompForm({ name: c.name, season: c.season }); }} className="h-8 px-2 rounded border border-zinc-800 hover:border-zinc-700">Edit</button>
                  <button onClick={()=>deleteCompetition(c.competition_id)} className="h-8 px-2 rounded border border-red-900 text-red-300 hover:border-red-700">Delete</button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Venues</h2>
        <div className="mb-3 grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
          <input placeholder="Name" value={newVenue.name||""} onChange={e=>setNewVenue(s=>({...s, name: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm" />
          <input placeholder="City" value={newVenue.city||""} onChange={e=>setNewVenue(s=>({...s, city: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm" />
          <input placeholder="Latitude" value={newVenue.latitude ?? ''} onChange={e=>setNewVenue(s=>({...s, latitude: e.target.value === '' ? undefined : Number(e.target.value)}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm" />
          <input placeholder="Longitude" value={newVenue.longitude ?? ''} onChange={e=>setNewVenue(s=>({...s, longitude: e.target.value === '' ? undefined : Number(e.target.value)}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm" />
          <button disabled={saving} onClick={createVenue} className="h-9 px-3 rounded border border-zinc-800 hover:border-zinc-700">Add</button>
        </div>
        <div className="space-y-2">
          {venues.map(v => (
            <div key={v.venue_id} className="border border-zinc-800 rounded p-3">
              {editingVenueId === v.venue_id ? (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                  <input defaultValue={v.name} onChange={e=>setVenueForm(s=>({...s, name: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm" />
                  <input defaultValue={v.city||""} onChange={e=>setVenueForm(s=>({...s, city: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm" />
                  <input defaultValue={v.latitude ?? ''} onChange={e=>setVenueForm(s=>({...s, latitude: e.target.value === '' ? undefined : Number(e.target.value)}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm" />
                  <input defaultValue={v.longitude ?? ''} onChange={e=>setVenueForm(s=>({...s, longitude: e.target.value === '' ? undefined : Number(e.target.value)}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm" />
                  <div className="flex gap-2">
                    <button disabled={saving} onClick={()=>saveVenue(v.venue_id)} className="h-9 px-3 rounded border border-zinc-700">Save</button>
                    <button onClick={()=>{ setEditingVenueId(null); setVenueForm({}); }} className="h-9 px-3 rounded border border-zinc-800">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-medium">{v.name}</div>
                    <div className="text-xs text-zinc-400">{v.city || '—'} {typeof v.latitude === 'number' && typeof v.longitude === 'number' ? `· (${v.latitude.toFixed(5)}, ${v.longitude.toFixed(5)})` : ''}</div>
                  </div>
                  <button onClick={()=>{ setEditingVenueId(v.venue_id); setVenueForm({ name: v.name, city: v.city, latitude: v.latitude, longitude: v.longitude }); }} className="h-8 px-2 rounded border border-zinc-800 hover:border-zinc-700">Edit</button>
                  <button onClick={()=>deleteVenue(v.venue_id)} className="h-8 px-2 rounded border border-red-900 text-red-300 hover:border-red-700">Delete</button>
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
            <label className="block text-xs text-zinc-400">Name</label>
            <input value={newTeam.name||""} onChange={e=>setNewTeam(s=>({...s, name: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400">Category</label>
            <input value={newTeam.category||""} onChange={e=>setNewTeam(s=>({...s, category: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm" />
          </div>
          <button disabled={saving} onClick={createTeam} className="h-9 px-3 rounded border border-zinc-800 hover:border-zinc-700">Add</button>
        </div>
        <div className="space-y-2">
          {teams.map(t => (
            <div key={t.team_id} className="border border-zinc-800 rounded p-3 flex items-center gap-3">
              {editingTeamId === t.team_id ? (
                <>
                  <input defaultValue={t.name} onChange={e=>setTeamForm(s=>({...s, name: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm flex-1" />
                  <input defaultValue={t.category||""} onChange={e=>setTeamForm(s=>({...s, category: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm w-40" />
                  <button disabled={saving} onClick={()=>saveTeam(t.team_id)} className="h-9 px-3 rounded border border-zinc-700">Save</button>
                  <button onClick={()=>{ setEditingTeamId(null); setTeamForm({}); }} className="h-9 px-3 rounded border border-zinc-800">Cancel</button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      <span>{t.name}</span>
                      <span className="text-xs text-zinc-500">{t.team_id.slice(0,4)}</span>
                    </div>
                    <div className="text-xs text-zinc-400">{t.category || '—'}</div>
                  </div>
                  <button onClick={()=>{ setEditingTeamId(t.team_id); setTeamForm({ name: t.name, category: t.category }); }} className="h-8 px-2 rounded border border-zinc-800 hover:border-zinc-700">Edit</button>
                  <button onClick={()=>deleteTeam(t.team_id)} className="h-8 px-2 rounded border border-red-900 text-red-300 hover:border-red-700">Delete</button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Matches</h2>
        <div className="mb-3 grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
          <input type="datetime-local" value={newMatch.match_date as string || ''} onChange={e=>setNewMatch(s=>({...s, match_date: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm" />
          <select value={newMatch.home_team_id as string || ''} onChange={e=>setNewMatch(s=>({...s, home_team_id: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm">
            <option value="">Home team</option>
            {teams.map(t=> <option key={t.team_id} value={t.team_id}>{t.name}</option>)}
          </select>
          <select value={newMatch.away_team_id as string || ''} onChange={e=>setNewMatch(s=>({...s, away_team_id: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm">
            <option value="">Away team</option>
            {teams.map(t=> <option key={t.team_id} value={t.team_id}>{t.name}</option>)}
          </select>
          <select value={newMatch.venue_id as string || ''} onChange={e=>setNewMatch(s=>({...s, venue_id: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm">
            <option value="">Venue</option>
            {venues.map(v=> <option key={v.venue_id} value={v.venue_id}>{v.name}</option>)}
          </select>
          <select value={newMatch.competition_id as string || ''} onChange={e=>setNewMatch(s=>({...s, competition_id: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm">
            <option value="">Competition</option>
            {competitions.map(c=> <option key={c.competition_id} value={c.competition_id}>{c.name}</option>)}
          </select>
          <button disabled={saving} onClick={createMatch} className="h-9 px-3 rounded border border-zinc-800 hover:border-zinc-700">Add</button>
        </div>
        <div className="space-y-2">
          {matches.map(m => (
            <div key={m.match_id} className="border border-zinc-800 rounded p-3">
              {editingMatchId === m.match_id ? (
                <div className="grid grid-cols-1 md:grid-cols-8 gap-2 items-center">
                  <input type="datetime-local" defaultValue={m.match_date?.slice(0,16)} onChange={e=>setMatchForm(s=>({...s, match_date: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm" />
                  <select defaultValue={m.home_team_id} onChange={e=>setMatchForm(s=>({...s, home_team_id: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm">
                    {teams.map(t=> <option key={t.team_id} value={t.team_id}>{t.name}</option>)}
                  </select>
                  <select defaultValue={m.away_team_id} onChange={e=>setMatchForm(s=>({...s, away_team_id: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm">
                    {teams.map(t=> <option key={t.team_id} value={t.team_id}>{t.name}</option>)}
                  </select>
                  <input placeholder="Category" defaultValue={m.category||''} onChange={e=>setMatchForm(s=>({...s, category: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm" />
                  <input placeholder="YouTube" defaultValue={m.youtube_link||''} onChange={e=>setMatchForm(s=>({...s, youtube_link: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm" />
                  <input placeholder="Notes" defaultValue={m.notes||''} onChange={e=>setMatchForm(s=>({...s, notes: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm" />
                  <input placeholder="GPS table" defaultValue={m.gps_table_name||''} onChange={e=>setMatchForm(s=>({...s, gps_table_name: e.target.value}))} className="h-9 rounded bg-zinc-900/50 border border-zinc-800 px-2 text-sm" />
                  <div className="flex gap-2">
                    <button disabled={saving} onClick={()=>saveMatch(m.match_id)} className="h-9 px-3 rounded border border-zinc-700">Save</button>
                    <button onClick={()=>{ setEditingMatchId(null); setMatchForm({}); }} className="h-9 px-3 rounded border border-zinc-800">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-medium">{m.home_team_name || m.home_team_id.slice(0,6)} vs {m.away_team_name || m.away_team_id.slice(0,6)}</div>
                    <div className="text-xs text-zinc-400">{new Date(m.match_date).toLocaleString()} · Result {m.result_home}-{m.result_away}</div>
                  </div>
                  <button onClick={()=>{ setEditingMatchId(m.match_id); setMatchForm({}); }} className="h-8 px-2 rounded border border-zinc-800 hover:border-zinc-700">Edit</button>
                  <button onClick={()=>deleteMatch(m.match_id)} className="h-8 px-2 rounded border border-red-900 text-red-300 hover:border-red-700">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}


