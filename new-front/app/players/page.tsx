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
  max_speed_detail?: { match_id?: string; gps_table_name?: string; minute?: string; time?: string; manual_first_half_start?: number|null };
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

  const findBestPhoto = React.useCallback((name: string): string | undefined => {
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
      if (s > bestS) { bestS = s; bestPath = f.path; }
    }
    return bestS >= 0.28 ? bestPath : undefined; // threshold tuned lightly
  }, [fotosIndex, similarity]);
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
              return findBestPhoto(display);
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
      const best = findBestPhoto(display);
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
      setSelectedPerson(list[0] ?? null);
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
      if (!pid) { setMaxMetrics(null); return; }
      try {
        const res = await fetch(`${API_BASE}/player/${pid}/metrics/max`, { cache: 'no-store' });
        if (!res.ok) throw new Error('failed');
        const json = await res.json();
        if (!cancelled) setMaxMetrics(json as PlayerMaxMetrics);
      } catch (e) {
        if (!cancelled) setMaxMetrics(null);
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

  const kpis = React.useMemo(() => ([
    { title: "Max. Dist", value: maxMetrics ? `${maxMetrics.max_distance_m} m` : "4013 m", link: "/match" },
    { title: "HSR Max", value: maxMetrics ? `${maxMetrics.hsr_max_m} m` : "1653 m" },
    { title: "Velocidad Max.", value: maxMetrics ? `${(Math.round(maxMetrics.max_speed_kmh * 100) / 100).toFixed(2)} km/h` : "27 km/h", link: matchHref },
    { title: "High Metab. Dist.", value: maxMetrics ? `${maxMetrics.high_metabolic_distance_m} m` : "550 m" },
    { title: "z6", value: maxMetrics ? `${maxMetrics.z6.seconds}\" (${maxMetrics.z6.distance_m}m)` : '15" (229m)' },
  ]), [maxMetrics, matchHref]);

  return (
    <main className="flex flex-col lg:flex-row gap-6 p-4">
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
                        <AvatarImage alt={person.Jugador ?? undefined} src={person.path_foto || undefined} />
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
                  <AvatarImage alt={selected.Jugador ?? undefined} src={selected.path_foto || undefined} className="aspect-auto w-full h-auto object-contain bg-zinc-900" />
                  <AvatarFallback className="h-44 text-2xl">{(selected.Jugador || selected.nombre || "?").slice(0,1)}</AvatarFallback>
                </Avatar>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
            </CardContent>

            <CardContent className="w-full mt-2">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {kpis.map((kpi) => (
                  <Card key={kpi.title} className="bg-zinc-900/60 border-zinc-800">
                    <CardContent className="py-3">
                      <div className="text-sm text-zinc-300">{kpi.title}</div>
                      <div className="text-xl font-semibold">
                        {kpi.title === "Velocidad Max." && !maxMetrics ? (
                          <Loader2 className="inline-block h-4 w-4 animate-spin text-zinc-400" />
                        ) : (
                          kpi.value
                        )}
                      </div>
                      {kpi.title === "Velocidad Max." && (maxMetrics?.max_speed_detail?.minute || maxMetrics?.max_speed_detail?.time) ? (
                        <a href={matchHref} className="text-[11px] text-zinc-400 mt-1 inline-block hover:underline" title={`tiempo real: ${maxMetrics.max_speed_detail.time ?? '—'} | inicio PT manual: ${maxMetrics.max_speed_detail.manual_first_half_start ?? '—'}s`}>
                          {`minuto ${soccerMinute ?? '—'}`}
                          {maxMetrics.max_speed_detail.gps_table_name ? ` · ${maxMetrics.max_speed_detail.gps_table_name}` : ""}
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