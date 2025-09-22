"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "./components/ui/avatar";
import { Mail, Phone, Smartphone, User, Ruler, Activity, Calendar, FileText, Stamp, HeartPulse, GraduationCap, MapPin, Building2, Percent, Tag, List as ListIcon, Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  ComposedChart,
  Legend,
} from "recharts";

// Reuse time helpers from the match view
import { formatMmSsFromSeconds } from "@/app/match/utils/time";
import { Progress } from "@/components/ui/progress";
import { useServerPhotoBlocks } from "../hooks/useServerPhotoBlocks";
import SkillsetComparator from "@/app/components/SkillsetComparator";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Person = {
  id?: number;
  Documento_de_Identidad?: number;
  Jugador?: string | null;
  nombre?: string | null;
  Posicion?: string | null;
  Fecha_Nacimiento?: string | null;
  Pasaporte?: string | null;
  Telefono?: string | null;
  Celular?: string | null;
  Email?: string | null;
  Cobertura_Medica?: string | null;
  Estudios?: string | null;
  Oriundo?: string | null;
  Club_de_Origen?: string | null;
  Club_de_Origen_Porcentaje?: string | null;
  path_foto?: string | null;
  personalMetrics?: string | null;
  masaF0?: string | number | null;
  sumatoriaPliegues?: string | number | null;
  relacionMusculoHueso?: string | number | null;
};

type PlayerMaxMetrics = {
  max_distance_m: number;
  hsr_max_m: number;
  max_speed_kmh: number;
  high_metabolic_distance_m: number;
  z6: { seconds: number; distance_m: number };
  z6_detail?: { match_id?: string; gps_table_name?: string };
  max_speed_detail?: { match_id?: string; gps_table_name?: string; minute?: string; time?: string; manual_first_half_start?: number|null };
  max_distance_detail?: { match_id?: string; gps_table_name?: string };
  hsr_max_detail?: { match_id?: string; gps_table_name?: string };
  hmld?: { m25_5?: number; m18?: number };
  hmld_detail?: { m25_5?: { match_id?: string; gps_table_name?: string }, m18?: { match_id?: string; gps_table_name?: string } };
};

const rendimiento = [
  { name: "A", hsr: 100, distancia: 220 },
  { name: "B", hsr: 200, distancia: 300 },
  { name: "C", hsr: 180, distancia: 260 },
];

const databloque = [
  { day: "-5", distanciaTotal: 5709, distanciaHML: 801, promedioHSR: 213 },
  { day: "-4", distanciaTotal: 5008, distanciaHML: 595, promedioHSR: 151 },
  { day: "-3", distanciaTotal: 4981, distanciaHML: 686, promedioHSR: 159 },
  { day: "-2", distanciaTotal: 5201, distanciaHML: 552, promedioHSR: 185 },
  { day: "-1", distanciaTotal: 2751, distanciaHML: 250, promedioHSR: 36 },
];

function calcAge(birthDate?: string | null) {
  if (!birthDate) return undefined as number | undefined;
  const today = new Date();
  const birth = new Date((birthDate || "").replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$2/$1/$3"));
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function Page() {
  const [selectedPerson, setSelectedPerson] = React.useState<Person | null>(null);
  const [filter, setFilter] = React.useState<string>("");
  const [persons, setPersons] = React.useState<Person[]>([]);
  const [maxMetrics, setMaxMetrics] = React.useState<PlayerMaxMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = React.useState<boolean>(false);
  const { isBlocked, block, unblock } = useServerPhotoBlocks(API_BASE);
  type FotoIndexItem = { nombreNorm: string; path: string };
  const [fotosIndex, setFotosIndex] = React.useState<FotoIndexItem[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/player/photos`, { cache: 'no-store' });
        const json = await res.json();
        const normalize = (s: string) => s
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const arr = Array.isArray(json?.fotos) ? json.fotos : [];
        const idx: FotoIndexItem[] = arr
          .filter((f: any) => f && typeof f.nombre === 'string' && f.nombre.trim() && typeof f.path === 'string' && f.path.trim())
          .map((f: any) => ({ nombreNorm: normalize(f.nombre as string), path: f.path as string }));
        if (!cancelled) setFotosIndex(idx);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const trigramSet = React.useCallback((s: string) => {
    const str = `  ${s}  `; // pad
    const set = new Set<string>();
    for (let i = 0; i < str.length - 2; i++) {
      set.add(str.slice(i, i + 3));
    }
    return set;
  }, []);

  const similarity = React.useCallback((a: string, b: string) => {
    if (!a || !b) return 0;
    const A = trigramSet(a);
    const B = trigramSet(b);
    let inter = 0;
    A.forEach((t) => { if (B.has(t)) inter++; });
    const union = A.size + B.size - inter;
    return union === 0 ? 0 : inter / union;
  }, [trigramSet]);

  const findBestPhoto = React.useCallback((name: string, playerId?: number): string | undefined => {
    const normalize = (s: string) => s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const n = normalize(name);
    if (!n) return undefined;
    let bestS = 0;
    let bestPath: string | undefined = undefined;
    for (const f of fotosIndex) {
      const s = similarity(n, f.nombreNorm);
      if (s > bestS) {
        // skip blocked path for this player if provided
        if (playerId != null && isBlocked(playerId, f.path)) continue;
        bestS = s; bestPath = f.path;
      }
    }
    return bestS >= 0.28 ? bestPath : undefined; // threshold tuned lightly
  }, [fotosIndex, similarity, isBlocked]);
  const list = React.useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return persons;
    return persons.filter(p => `${p.Jugador ?? ""} ${p.nombre ?? ""} ${p.Posicion ?? ""}`.toLowerCase().includes(f));
  }, [persons, filter]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/players/active?limit_matches=20`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          const normalized: Person[] = data.map((p: any) => ({
            ...p,
            id: p.id ?? p.Documento_de_Identidad ?? undefined,
            path_foto: (() => {
              const display = (p.Jugador ?? p.nombre ?? '') as string;
              return findBestPhoto(display, p.id ?? p.Documento_de_Identidad ?? undefined);
            })()
          }));
          setPersons(normalized);
          if (normalized.length > 0) setSelectedPerson(normalized[0]);
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Re-enrich photos when the fotosIndex arrives
  React.useEffect(() => {
    if (fotosIndex.length === 0 || persons.length === 0) return;
    setPersons(prev => prev.map(p => {
      const display = (p.Jugador ?? p.nombre ?? '') as string;
      const best = findBestPhoto(display, p.id ?? p.Documento_de_Identidad ?? undefined);
      return best && best !== p.path_foto ? { ...p, path_foto: best } : p;
    }));
    // do not add findBestPhoto as dep to avoid function identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotosIndex]);

  // Select first player by default on initial load
  React.useEffect(() => {
    if (!selectedPerson && persons.length > 0) {
      setSelectedPerson(persons[0]);
    }
  }, [persons, selectedPerson]);

  // If current selection is filtered out, pick first in current list
  React.useEffect(() => {
    if (selectedPerson && !list.some(p => p.id === selectedPerson.id)) {
      if (list.length > 0) setSelectedPerson(list[0]);
    }
  }, [list, selectedPerson]);

  // Always use the freshest instance of the selected person from persons (keeps path_foto in sync)
  const selected = React.useMemo(() => {
    if (!selectedPerson) return null;
    return persons.find(p => p.id === selectedPerson.id) ?? selectedPerson;
  }, [persons, selectedPerson]);

  // Fetch player maximum metrics from API when selection changes
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const pid = selected?.id;
      setLoadingMetrics(true);
      setMaxMetrics(null);
      if (!pid) { setLoadingMetrics(false); return; }
      try {
        const res = await fetch(`${API_BASE}/player/${pid}/metrics/max`, { cache: 'no-store' });
        if (!res.ok) throw new Error('failed');
        const json = await res.json();
        if (!cancelled) setMaxMetrics(json as PlayerMaxMetrics);
      } catch (e) {
        if (!cancelled) setMaxMetrics(null);
      } finally {
        if (!cancelled) setLoadingMetrics(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selected?.id]);

  // Helpers to derive soccer minute from absolute time-of-day, using same logic as match view
  const parseHmsToSec = React.useCallback((t?: string | null): number | undefined => {
    if (!t) return undefined;
    const m = t.match(/^(\d{2}):(\d{2}):(\d{2})(?:[\.:](\d+))?/);
    if (!m) return undefined;
    const h = parseInt(m[1] || "0", 10);
    const mi = parseInt(m[2] || "0", 10);
    const s = parseInt(m[3] || "0", 10);
    return h * 3600 + mi * 60 + s;
  }, []);

  const soccerMinute = React.useMemo(() => {
    const d = maxMetrics?.max_speed_detail;
    if (!d) return undefined;
    const absSec = parseHmsToSec(d.time);
    const fh = typeof d.manual_first_half_start === "number" ? d.manual_first_half_start : undefined;
    if (absSec === undefined || fh === undefined) return undefined;
    const halftime = 15 * 60; // fallback if we don't have detected halftime
    const sh = fh + 45 * 60 + halftime;
    if (absSec >= sh) {
      const delta = Math.max(0, Math.round(absSec - sh));
      return formatMmSsFromSeconds(45 * 60 + delta);
    }
    if (absSec >= fh) {
      const delta = Math.max(0, Math.round(absSec - fh));
      return formatMmSsFromSeconds(delta);
    }
    return undefined;
  }, [maxMetrics?.max_speed_detail, parseHmsToSec]);

  const matchHref = React.useMemo(() => {
    const d = maxMetrics?.max_speed_detail;
    const id = d?.match_id;
    const table = d?.gps_table_name;
    if (id) return `/match?match=${id}`;
    if (table) return `/match?table=${encodeURIComponent(table)}`;
    return "/match";
  }, [maxMetrics?.max_speed_detail]);

  const [maxSpeedMatchLabel, setMaxSpeedMatchLabel] = React.useState<string | null>(null);
  React.useEffect(() => {
    const d = maxMetrics?.max_speed_detail;
    setMaxSpeedMatchLabel(null);
    if (!d) return;
    let cancelled = false;
    (async () => {
      try {
        if (d.match_id) {
          const res = await fetch(`${API_BASE}/api/matches/${d.match_id}`);
          if (res.ok) {
            const md = await res.json();
            const home = md?.home_team_name || md?.home_team_id?.slice(0, 8);
            const away = md?.away_team_name || md?.away_team_id?.slice(0, 8);
            const label = home && away ? `${home} vs ${away}` : undefined;
            if (!cancelled && label) setMaxSpeedMatchLabel(label);
          }
        } else if (d.gps_table_name) {
          const res = await fetch(`${API_BASE}/api/matches`);
          if (res.ok) {
            const arr = await res.json();
            const found = Array.isArray(arr) ? arr.find((m: any) => m?.gps_table_name === d.gps_table_name) : null;
            if (found) {
              const home = found?.home_team_name || found?.home_team_id?.slice(0, 8);
              const away = found?.away_team_name || found?.away_team_id?.slice(0, 8);
              const label = home && away ? `${home} vs ${away}` : undefined;
              if (!cancelled && label) setMaxSpeedMatchLabel(label);
            }
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [API_BASE, maxMetrics?.max_speed_detail]);

  const maxDistanceHref = React.useMemo(() => {
    const d = maxMetrics?.max_distance_detail;
    const id = d?.match_id;
    const table = d?.gps_table_name;
    if (id) return `/match?match=${id}`;
    if (table) return `/match?table=${encodeURIComponent(table)}`;
    return "/match";
  }, [maxMetrics?.max_distance_detail]);

  const hsrHref = React.useMemo(() => {
    const d = maxMetrics?.hsr_max_detail;
    const id = d?.match_id;
    const table = d?.gps_table_name;
    if (id) return `/match?match=${id}`;
    if (table) return `/match?table=${encodeURIComponent(table)}`;
    return "/match";
  }, [maxMetrics?.hsr_max_detail]);

  const hmld25Href = React.useMemo(() => {
    const d = maxMetrics?.hmld_detail?.m25_5;
    const id = d?.match_id;
    const table = d?.gps_table_name;
    if (id) return `/match?match=${id}`;
    if (table) return `/match?table=${encodeURIComponent(table)}`;
    return "/match";
  }, [maxMetrics?.hmld_detail?.m25_5]);
  const z6Href = React.useMemo(() => {
    const d = maxMetrics?.z6_detail;
    const id = d?.match_id;
    const table = d?.gps_table_name;
    if (id) return `/match?match=${id}`;
    if (table) return `/match?table=${encodeURIComponent(table)}`;
    return "/match";
  }, [maxMetrics?.z6_detail]);

  const [z6MatchLabel, setZ6MatchLabel] = React.useState<string | null>(null);
  React.useEffect(() => {
    const d = maxMetrics?.z6_detail;
    setZ6MatchLabel(null);
    if (!d) return;
    let cancelled = false;
    (async () => {
      try {
        if (d.match_id) {
          const res = await fetch(`${API_BASE}/api/matches/${d.match_id}`);
          if (res.ok) {
            const md = await res.json();
            const home = md?.home_team_name || md?.home_team_id?.slice(0, 8);
            const away = md?.away_team_name || md?.away_team_id?.slice(0, 8);
            const label = home && away ? `${home} vs ${away}` : undefined;
            if (!cancelled && label) setZ6MatchLabel(label);
          }
        } else if (d.gps_table_name) {
          const res = await fetch(`${API_BASE}/api/matches`);
          if (res.ok) {
            const arr = await res.json();
            const found = Array.isArray(arr) ? arr.find((m: any) => m?.gps_table_name === d.gps_table_name) : null;
            if (found) {
              const home = found?.home_team_name || found?.home_team_id?.slice(0, 8);
              const away = found?.away_team_name || found?.away_team_id?.slice(0, 8);
              const label = home && away ? `${home} vs ${away}` : undefined;
              if (!cancelled && label) setZ6MatchLabel(label);
            }
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [API_BASE, maxMetrics?.z6_detail]);

  const [maxDistanceMatchLabel, setMaxDistanceMatchLabel] = React.useState<string | null>(null);
  React.useEffect(() => {
    const d = maxMetrics?.max_distance_detail;
    setMaxDistanceMatchLabel(null);
    if (!d) return;
    let cancelled = false;
    (async () => {
      try {
        if (d.match_id) {
          const res = await fetch(`${API_BASE}/api/matches/${d.match_id}`);
          if (res.ok) {
            const md = await res.json();
            const home = md?.home_team_name || md?.home_team_id?.slice(0, 8);
            const away = md?.away_team_name || md?.away_team_id?.slice(0, 8);
            const label = home && away ? `${home} vs ${away}` : undefined;
            if (!cancelled && label) setMaxDistanceMatchLabel(label);
          }
        } else if (d.gps_table_name) {
          const res = await fetch(`${API_BASE}/api/matches`);
          if (res.ok) {
            const arr = await res.json();
            const found = Array.isArray(arr) ? arr.find((m: any) => m?.gps_table_name === d.gps_table_name) : null;
            if (found) {
              const home = found?.home_team_name || found?.home_team_id?.slice(0, 8);
              const away = found?.away_team_name || found?.away_team_id?.slice(0, 8);
              const label = home && away ? `${home} vs ${away}` : undefined;
              if (!cancelled && label) setMaxDistanceMatchLabel(label);
            }
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [API_BASE, maxMetrics?.max_distance_detail]);

  const [hsrMatchLabel, setHsrMatchLabel] = React.useState<string | null>(null);
  React.useEffect(() => {
    const d = maxMetrics?.hsr_max_detail;
    setHsrMatchLabel(null);
    if (!d) return;
    let cancelled = false;
    (async () => {
      try {
        if (d.match_id) {
          const res = await fetch(`${API_BASE}/api/matches/${d.match_id}`);
          if (res.ok) {
            const md = await res.json();
            const home = md?.home_team_name || md?.home_team_id?.slice(0, 8);
            const away = md?.away_team_name || md?.away_team_id?.slice(0, 8);
            const label = home && away ? `${home} vs ${away}` : undefined;
            if (!cancelled && label) setHsrMatchLabel(label);
          }
        } else if (d.gps_table_name) {
          const res = await fetch(`${API_BASE}/api/matches`);
          if (res.ok) {
            const arr = await res.json();
            const found = Array.isArray(arr) ? arr.find((m: any) => m?.gps_table_name === d.gps_table_name) : null;
            if (found) {
              const home = found?.home_team_name || found?.home_team_id?.slice(0, 8);
              const away = found?.away_team_name || found?.away_team_id?.slice(0, 8);
              const label = home && away ? `${home} vs ${away}` : undefined;
              if (!cancelled && label) setHsrMatchLabel(label);
            }
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [API_BASE, maxMetrics?.hsr_max_detail]);

  const [hmld25MatchLabel, setHmld25MatchLabel] = React.useState<string | null>(null);
  React.useEffect(() => {
    const d = maxMetrics?.hmld_detail?.m25_5;
    setHmld25MatchLabel(null);
    if (!d) return;
    let cancelled = false;
    (async () => {
      try {
        if (d.match_id) {
          const res = await fetch(`${API_BASE}/api/matches/${d.match_id}`);
          if (res.ok) {
            const md = await res.json();
            const home = md?.home_team_name || md?.home_team_id?.slice(0, 8);
            const away = md?.away_team_name || md?.away_team_id?.slice(0, 8);
            const label = home && away ? `${home} vs ${away}` : undefined;
            if (!cancelled && label) setHmld25MatchLabel(label);
          }
        } else if (d.gps_table_name) {
          const res = await fetch(`${API_BASE}/api/matches`);
          if (res.ok) {
            const arr = await res.json();
            const found = Array.isArray(arr) ? arr.find((m: any) => m?.gps_table_name === d.gps_table_name) : null;
            if (found) {
              const home = found?.home_team_name || found?.home_team_id?.slice(0, 8);
              const away = found?.away_team_name || found?.away_team_id?.slice(0, 8);
              const label = home && away ? `${home} vs ${away}` : undefined;
              if (!cancelled && label) setHmld25MatchLabel(label);
            }
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [API_BASE, maxMetrics?.hmld_detail?.m25_5]);

  const kpis = React.useMemo(() => ([
    { title: "Max. Dist", value: maxMetrics ? `${maxMetrics.max_distance_m} m` : "—", link: maxDistanceHref },
    { title: "HSR Max", value: maxMetrics ? `${maxMetrics.hsr_max_m} m` : "—", link: hsrHref },
    { title: "Velocidad Max.", value: maxMetrics ? `${(Math.round(maxMetrics.max_speed_kmh * 100) / 100).toFixed(2)} km/h` : "27 km/h", link: matchHref },
    { title: `HMLD ${maxMetrics ? `(25.5 · 18)` : ''}`, value: maxMetrics ? `${Math.round(maxMetrics.hmld?.m25_5 ?? 0)} m · ${Math.round(maxMetrics.hmld?.m18 ?? 0)} m` : "—" },
    { title: "z6", value: maxMetrics ? `${maxMetrics.z6.seconds}\" (${maxMetrics.z6.distance_m}m)` : '—', link: z6Href },
  ]), [maxMetrics, matchHref, maxDistanceHref, hsrHref, z6Href]);

  // Skill comparator: normalize values 0-10 using extrema from API
  type Extrema = {
    max_distance_m: { min: number; max: number };
    hsr_max_m: { min: number; max: number };
    max_speed_kmh: { min: number; max: number };
    hmld_25_5_m: { min: number; max: number };
    z6_seconds: { min: number; max: number };
    averages?: {
      max_distance_m: number;
      hsr_max_m: number;
      max_speed_kmh: number;
      hmld_25_5_m: number;
      z6_seconds: number;
      age_years: number;
    }
  } | null;
  const [extrema, setExtrema] = React.useState<Extrema>(null);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/player/metrics/extrema`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setExtrema(json);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const normalize = (value: number, min: number, max: number) => {
    if (!isFinite(value) || !isFinite(min) || !isFinite(max) || max <= min) return 0;
    return clamp(((value - min) / (max - min)) * 10, 0, 10);
  };

  const age = React.useMemo(() => calcAge(selected?.Fecha_Nacimiento), [selected?.Fecha_Nacimiento]);
  const ageRange = React.useMemo(() => ({ min: 14, max: 45 }), []);

  const skillCategories = [
    "Max. Dist",
    "HSR Max",
    "Velocidad Max.",
    "HMLD 25.5",
    "z6 segs",
    "Edad",
  ];

  const playerSkillValues = React.useMemo(() => {
    if (!maxMetrics) return [0,0,0,0,0, age ? normalize(age, ageRange.min, ageRange.max) : 0];
    const v1 = normalize(maxMetrics.max_distance_m ?? 0, extrema?.max_distance_m.min ?? 0, extrema?.max_distance_m.max ?? 1);
    const v2 = normalize(maxMetrics.hsr_max_m ?? 0, extrema?.hsr_max_m.min ?? 0, extrema?.hsr_max_m.max ?? 1);
    const v3 = normalize(maxMetrics.max_speed_kmh ?? 0, extrema?.max_speed_kmh.min ?? 0, extrema?.max_speed_kmh.max ?? 1);
    const v4 = normalize((maxMetrics.hmld?.m25_5 ?? 0), extrema?.hmld_25_5_m.min ?? 0, extrema?.hmld_25_5_m.max ?? 1);
    const v5 = normalize((maxMetrics.z6?.seconds ?? 0), extrema?.z6_seconds.min ?? 0, extrema?.z6_seconds.max ?? 1);
    const v6 = age ? normalize(age, ageRange.min, ageRange.max) : 0;
    return [v1,v2,v3,v4,v5,v6];
  }, [maxMetrics, extrema, age, ageRange.min, ageRange.max]);

  const referenceSkillValues = React.useMemo(() => {
    if (!extrema?.averages) return [7.5,7.5,7.5,7.5,7.5,5.0];
    const a1 = normalize(extrema.averages.max_distance_m, extrema.max_distance_m.min, extrema.max_distance_m.max);
    const a2 = normalize(extrema.averages.hsr_max_m, extrema.hsr_max_m.min, extrema.hsr_max_m.max);
    const a3 = normalize(extrema.averages.max_speed_kmh, extrema.max_speed_kmh.min, extrema.max_speed_kmh.max);
    const a4 = normalize(extrema.averages.hmld_25_5_m, extrema.hmld_25_5_m.min, extrema.hmld_25_5_m.max);
    const a5 = normalize(extrema.averages.z6_seconds, extrema.z6_seconds.min, extrema.z6_seconds.max);
    const a6 = normalize(extrema.averages.age_years, ageRange.min, ageRange.max);
    return [a1,a2,a3,a4,a5,a6];
  }, [extrema, ageRange.min, ageRange.max]);
  const skillSeries = React.useMemo(() => ([
    { name: selected?.Jugador || selected?.nombre || "Jugador", data: playerSkillValues, color: "#3b82f6", fillOpacity: 0.22 },
    { name: "Referencia", data: referenceSkillValues, color: "#ef4444", strokeDasharray: "4 3", fillOpacity: 0.12 },
  ]), [playerSkillValues, selected?.Jugador, selected?.nombre, referenceSkillValues]);

  return (
    <main className="flex flex-col lg:flex-row gap-6 p-4">
      {loadingMetrics && (
        <div className="fixed left-0 right-0 top-0 z-40">
          <Progress value={65} className="h-0.5 bg-zinc-800" />
        </div>
      )}
      <aside className="w-full lg:w-1/4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle>Active Players (our study)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="sticky top-0 z-10 mb-3 space-y-2">
              <input
                type="text"
                placeholder="Buscar jugador…"
                value={filter}
                onChange={(e)=>setFilter(e.target.value)}
                className="w-full h-9 rounded-md bg-zinc-900/60 border border-zinc-800 px-3 text-sm"
              />
            </div>
            <div className="h-[70vh] overflow-y-auto pr-1">
              <ul className="space-y-2">
                {list.map((person) => (
                  <li key={(person.Documento_de_Identidad ?? person.id ?? Math.random()).toString()}>
                    <Button
                      variant={selectedPerson?.id === person.id ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start gap-2 h-auto py-2 border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/60"
                      onClick={() => setSelectedPerson(person)}
                    >
                      <Avatar className="h-4 w-4">
                        <AvatarImage alt={person.Jugador ?? undefined} src={
                          isBlocked(
                            (typeof person.id === 'number' ? person.id : undefined) ?? (typeof person.Documento_de_Identidad === 'number' ? person.Documento_de_Identidad : undefined),
                            person.path_foto || undefined
                          ) ? undefined : (person.path_foto || undefined)
                        } />
                        <AvatarFallback>{(person.Jugador || person.nombre || "?").slice(0,1)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <div className="text-sm truncate">{person.Jugador || person.nombre}</div>
                        <div className="text-[11px] text-zinc-400 truncate">{person.Posicion || "—"}</div>
                      </div>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </aside>

      <section className="w-full lg:w-3/4">
        {!selected ? (
          <Card className="bg-zinc-900/50 border-zinc-800"><CardHeader><CardTitle>Selecciona un jugador</CardTitle></CardHeader></Card>
        ) : (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <User className="w-5 h-5" />
                <span className="truncate">{selected.Jugador || selected.nombre}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/5">
                <Avatar className="h-auto w-full rounded-md overflow-hidden mx-auto">
                  <AvatarImage alt={selected.Jugador ?? undefined} src={
                    isBlocked(
                      (typeof selected.id === 'number' ? selected.id : undefined) ?? (typeof selected.Documento_de_Identidad === 'number' ? selected.Documento_de_Identidad : undefined),
                      selected.path_foto || undefined
                    ) ? undefined : (selected.path_foto || undefined)
                  } className="aspect-auto w-full h-auto object-contain bg-zinc-900" />
                  <AvatarFallback className="h-44 text-2xl">{(selected.Jugador || selected.nombre || "?").slice(0,1)}</AvatarFallback>
                </Avatar>
                <div className="mt-2 flex gap-2">
                  {(() => {
                    const pid = ((typeof selected.id === 'number' ? selected.id : undefined) ?? (typeof selected.Documento_de_Identidad === 'number' ? selected.Documento_de_Identidad : undefined));
                    const path = selected.path_foto || undefined;
                    const blocked = isBlocked(pid, path);
                    return !blocked ? (
                      <Button size="sm" variant="outline" className="h-7" onClick={() => block(pid, path)}>Quitar foto</Button>
                    ) : (
                      <Button size="sm" variant="secondary" className="h-7" onClick={() => unblock(pid, path)}>Restaurar foto</Button>
                    );
                  })()}
                </div>
              </div>
              <div className="md:flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex items-center gap-2"><User className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Alias:</span> {selected.nombre || "—"}</div>
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Edad:</span> {calcAge(selected.Fecha_Nacimiento) ?? "—"}</div>
                  <div className="flex items-center gap-2"><Tag className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Posición:</span> {selected.Posicion || "—"}</div>
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Fecha Nac.:</span> {selected.Fecha_Nacimiento || "—"}</div>
                  <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Documento:</span> {selected.Documento_de_Identidad ?? "—"}</div>
                  <div className="flex items-center gap-2"><Stamp className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Pasaporte:</span> {selected.Pasaporte || "—"}</div>
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Teléfono:</span> {selected.Telefono || "—"}</div>
                  <div className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Celular:</span> {selected.Celular || "—"}</div>
                  <div className="sm:col-span-2 flex items-center gap-2"><Mail className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Email:</span> {selected.Email || "—"}</div>
                  <div className="sm:col-span-2 flex items-center gap-2"><HeartPulse className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Cobertura Médica:</span> {selected.Cobertura_Medica || "—"}</div>
                  <div className="sm:col-span-2 flex items-center gap-2"><GraduationCap className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Estudios:</span> {selected.Estudios || "—"}</div>
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Oriundo:</span> {selected.Oriundo || "—"}</div>
                  <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Club de Origen:</span> {selected.Club_de_Origen || "—"}</div>
                  <div className="flex items-center gap-2"><Percent className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">% Origen:</span> {selected.Club_de_Origen_Porcentaje || "—"}</div>
                  <div className="sm:col-span-2 flex items-center gap-2"><ListIcon className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Medidas personales:</span> {selected.personalMetrics || "—"}</div>
                </div>

                <Separator className="my-4 bg-zinc-800" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Card className="bg-zinc-900/60 border-zinc-800">
                    <CardContent className="pt-4">
                      <div className="text-xs text-zinc-400">Masa F0</div>
                      <div className="text-2xl font-semibold">{selected?.masaF0 || "—"}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-zinc-900/60 border-zinc-800">
                    <CardContent className="pt-4">
                      <div className="text-xs text-zinc-400">Sumatoria 6 Pliegues</div>
                      <div className="text-2xl font-semibold">{selected?.sumatoriaPliegues || "—"}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-zinc-900/60 border-zinc-800">
                    <CardContent className="pt-4">
                      <div className="text-xs text-zinc-400">Relación Músculo-Hueso</div>
                      <div className="text-2xl font-semibold">{selected?.relacionMusculoHueso || "—"}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>

            <CardContent className="w-full mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Ruler className="h-4 w-4"/>Medición del salto (curva y=x²)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[{name:'0', uv:0},{name:'1', uv:1},{name:'2', uv:4},{name:'3', uv:9}] }>
                          <Line type="monotone" dataKey="uv" stroke="#60a5fa" />
                          <CartesianGrid stroke="#27272a" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4"/>Rendimiento</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rendimiento}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="hsr" fill="#2563eb" name="HSR" />
                          <Bar dataKey="distancia" fill="#16a34a" name="Distancia" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader><CardTitle className="text-base">Skillset Reference</CardTitle></CardHeader>
                  <CardContent>
                    <SkillsetComparator categories={skillCategories} series={skillSeries} max={10} height={320} />
                  </CardContent>
                </Card>
              </div>
            </CardContent>

            <CardContent className="w-full mt-2">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {kpis.map((kpi) => (
                  <Card key={kpi.title} className="bg-zinc-900/60 border-zinc-800">
                    <CardContent className="py-3">
                      <div className="text-sm text-zinc-300">{kpi.title}</div>
                      <div className="text-xl font-semibold">
                        {(loadingMetrics && (kpi.title === "Velocidad Max." || kpi.title === "Max. Dist" || kpi.title === "HSR Max" || kpi.title.startsWith("HMLD") || kpi.title === "z6")) ? (
                          <Loader2 className="inline-block h-4 w-4 animate-spin text-zinc-400" />
                        ) : (
                          kpi.value
                        )}
                      </div>
                      {kpi.title.startsWith("HMLD") && maxMetrics?.hmld_detail ? (
                        <a href={hmld25Href} className="text-[11px] text-zinc-400 mt-1 inline-block hover:underline">
                          {hmld25MatchLabel || 'ver match'}
                        </a>
                      ) : null}
                      {kpi.title === "z6" && maxMetrics?.z6_detail ? (
                        <a href={z6Href} className="text-[11px] text-zinc-400 mt-1 inline-block hover:underline">
                          {z6MatchLabel || 'ver match'}
                        </a>
                      ) : null}
                      {kpi.title === "Max. Dist" && maxMetrics?.max_distance_detail ? (
                        <a href={maxDistanceHref} className="text-[11px] text-zinc-400 mt-1 inline-block hover:underline">
                          {maxDistanceMatchLabel || 'ver match'}
                        </a>
                      ) : null}
                      {kpi.title === "HSR Max" && maxMetrics?.hsr_max_detail ? (
                        <a href={hsrHref} className="text-[11px] text-zinc-400 mt-1 inline-block hover:underline">
                          {hsrMatchLabel || 'ver match'}
                        </a>
                      ) : null}
                      {kpi.title === "Velocidad Max." && maxMetrics?.max_speed_detail ? (
                        <a href={matchHref} className="text-[11px] text-zinc-400 mt-1 inline-block hover:underline" title={`tiempo real: ${maxMetrics.max_speed_detail.time ?? '—'} | inicio PT manual: ${maxMetrics.max_speed_detail.manual_first_half_start ?? '—'}s`}>
                          {maxSpeedMatchLabel || `ver match`}
                        </a>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>

            <CardContent className="w-full mt-2">
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-base">Bloque de Adquisición del jugador</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[420px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={databloque}>
                        <XAxis dataKey="day" />
                        <YAxis yAxisId={1} orientation="right" label={{ value: "Distancia Total", angle: -90 }} />
                        <Tooltip />
                        <Legend />
                        <CartesianGrid stroke="#27272a" />
                        <Bar yAxisId={1} dataKey="distanciaTotal" barSize={28} fill="#4f46e5" />
                        <Bar yAxisId={1} dataKey="distanciaHML" barSize={28} fill="#06b6d4" />
                        <YAxis yAxisId={2} label={{ value: "Promedio HSR", angle: -90 }} />
                        <Line yAxisId={2} type="monotone" dataKey="promedioHSR" stroke="#fff" dot />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}