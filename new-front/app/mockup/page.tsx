"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/players/components/ui/card";
import { Button } from "@/app/players/components/ui/button";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Calendar,
  ChevronRight,
  Clock3,
  Flag,
  Loader2,
  Search,
  Users2,
} from "lucide-react";

// Minimal local UI stubs to avoid missing shadcn imports
function Badge({ className = "", children, variant }: any) {
  return <span className={`inline-flex items-center rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-0.5 text-xs ${className}`}>{children}</span>;
}

const TabsContext = React.createContext<{ value: string; setValue: (v: string) => void } | null>(null);
function Tabs({ defaultValue, className = "", children }: any) {
  const [value, setValue] = useState(defaultValue);
  return <TabsContext.Provider value={{ value, setValue }}><div className={className}>{children}</div></TabsContext.Provider>;
}
function TabsList({ className = "", children }: any) {
  return <div className={className}>{children}</div>;
}
function TabsTrigger({ value, className = "", children }: any) {
  const ctx = React.useContext(TabsContext)!;
  const isActive = ctx.value === value;
  return (
    <button onClick={() => ctx.setValue(value)} className={`${className} px-3 py-1.5 text-sm rounded-md ${isActive ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}>
      {children}
    </button>
  );
}
function TabsContent({ value, className = "", children }: any) {
  const ctx = React.useContext(TabsContext)!;
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}

function Input(props: any) {
  return <input {...props} className={`h-9 rounded-md border border-zinc-800 bg-zinc-900/50 px-2 text-sm ${props.className ?? ""}`} />;
}

const SheetContext = React.createContext<{ open: boolean; onOpenChange?: (v: boolean) => void } | null>(null);
function Sheet({ open, onOpenChange, children }: any) {
  return <SheetContext.Provider value={{ open, onOpenChange }}>{children}</SheetContext.Provider>;
}
function SheetContent({ className = "", children }: any) {
  const ctx = React.useContext(SheetContext)!;
  return (
    <div className={`${className}`} style={{ display: ctx.open ? undefined : "none" }}>
      {children}
    </div>
  );
}
function SheetHeader({ className = "", children }: any) {
  return <div className={className}>{children}</div>;
}
function SheetTitle({ className = "", children }: any) {
  return <div className={className}>{children}</div>;
}

function ScrollArea({ className = "", children }: any) {
  return <div className={className} style={{ overflow: "auto" }}>{children}</div>;
}

function Separator({ className = "" }: any) {
  return <div className={`h-px w-full ${className}`} />;
}

function TooltipProvider({ children }: any) { return children; }
function Tooltip({ children }: any) { return children; }
function TooltipTrigger({ children }: any) { return children; }
function TooltipContent({ children }: any) { return children; }

// ------------------------------------------------------------
// Mock Data
// ------------------------------------------------------------
const TEAMS = [
  { id: "albion", name: "Albion", crest: "🟥" },
  { id: "wanderers", name: "Wanderers", crest: "⬛" },
  { id: "torque", name: "Torque", crest: "🟦" },
  { id: "rentistas", name: "Rentistas", crest: "🟥" },
  { id: "fenix", name: "Fénix", crest: "⬜" },
  { id: "danubio", name: "Danubio", crest: "⬛⬜" },
  { id: "defensor", name: "Defensor", crest: "🟪" },
  { id: "liverpool", name: "Liverpool (Uy)", crest: "⚫🔵" },
];

const MATCHES = [
  { id: "m1", opponent: "Albion", date: "2025-02-10", result: "2–1", outcome: "W" },
  { id: "m2", opponent: "Fénix", date: "2025-03-12", result: "0–0", outcome: "D" },
  { id: "m3", opponent: "Danubio", date: "2025-04-03", result: "1–2", outcome: "L" },
  { id: "m4", opponent: "Liverpool", date: "2025-05-18", result: "3–2", outcome: "W" },
  { id: "m5", opponent: "Torque", date: "2025-06-01", result: "1–1", outcome: "D" },
];

const PLAYERS = [
  { id: "p1", name: "Jhonatan Dalmas", position: "GK" },
  { id: "p2", name: "Cuadro Navarro", position: "DF" },
  { id: "p3", name: "Calione Fuentes", position: "DF" },
  { id: "p4", name: "Tomas Viera", position: "MF" },
  { id: "p5", name: "Echeverría Aznárez", position: "MF" },
  { id: "p6", name: "Nahuel López", position: "FW" },
  { id: "p7", name: "Del Pino Esquivo", position: "FW" },
  { id: "p8", name: "Facundo Domínguez", position: "FW" },
];

function genSeries(n = 60, base = 9) {
  const out = [];
  let t = 0;
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, base + Math.sin(i / 5) * 3 + (Math.random() - 0.5) * 2);
    out.push({ t: i, speed: Number(v.toFixed(2)) });
    t += 1;
  }
  return out;
}

const playerSeries = Object.fromEntries(PLAYERS.map(p => [p.id, genSeries(120, 8 + Math.random() * 5)]));

const matchPeriods = [
  { key: "PT", label: "Primer Tiempo", start: "09:06:20", end: "09:52:20", seconds: 46 * 60 },
  { key: "ET", label: "Entretiempo", start: "09:52:20", end: "10:06:28", seconds: 14 * 60 + 8 },
  { key: "ST", label: "Segundo Tiempo", start: "10:09:11", end: "10:54:30", seconds: 45 * 60 + 19 },
];

// ------------------------------------------------------------
// Helper UI
// ------------------------------------------------------------
function OutcomeBadge({ outcome }: { outcome: "W" | "D" | "L" }) {
  const map = {
    W: { label: "Win", className: "bg-emerald-600/20 text-emerald-400" },
    D: { label: "Draw", className: "bg-zinc-600/20 text-zinc-300" },
    L: { label: "Loss", className: "bg-rose-600/20 text-rose-400" },
  } as const;
  return <Badge className={`rounded-full ${map[outcome].className}`}>{outcome}</Badge>;
}

function KPI({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-zinc-400 font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {hint && <div className="text-xs text-zinc-500 mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-800/60 ${className}`} />;
}

// ------------------------------------------------------------
// Top Bar
// ------------------------------------------------------------
function TopBar({ onBack, view, tournament, setTournament }: any) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {view !== "league" && (
          <Button size="icon" variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="text-xl font-semibold">Sports Analytics Hub</h1>
          <p className="text-xs text-zinc-400">Dashboard de campeonato · métricas de equipo y jugador</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2">
          <select
            value={tournament}
            onChange={(e) => setTournament(e.target.value)}
            className="w-[200px] h-9 rounded-md bg-zinc-900/50 border border-zinc-800 px-2 text-sm"
          >
            <option value="apertura">Apertura</option>
            <option value="intermedio">Intermedio</option>
            <option value="clausura">Clausura</option>
          </select>
          <Button variant="outline" className="bg-zinc-900/50 border-zinc-800">
            <Calendar className="h-4 w-4 mr-2" />
            Rango de fechas
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
          <Input className="pl-8 w-[220px] bg-zinc-900/50 border-zinc-800" placeholder="Buscar partido o jugador" />
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// League View — grid of matches
// ------------------------------------------------------------
function LeagueView({ onOpenMatch }: { onOpenMatch: (id: string) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {MATCHES.map((m, idx) => (
        <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
          <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">vs {m.opponent}</CardTitle>
              <OutcomeBadge outcome={m.outcome as any} />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-zinc-400">
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{m.date}</div>
                <div className="flex items-center gap-2"><Flag className="h-4 w-4" />{m.result}</div>
              </div>
              <Separator className="my-4 bg-zinc-800" />
              <div className="flex items-center justify-between">
                <div className="text-xs text-zinc-500">Carga estimada: métricas, periodos, jugadores</div>
                <Button onClick={() => onOpenMatch(m.id)} size="sm" className="gap-2">
                  Ver partido <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Match View — overview, players, periods
// ------------------------------------------------------------
function MatchView({ matchId, onOpenPlayer }: { matchId: string; onOpenPlayer: (id: string) => void }) {
  const [loading, setLoading] = useState({ overview: true, charts: true, players: true, periods: true });

  useEffect(() => {
    // Staggered loading to simulate streaming API responses
    const t1 = setTimeout(() => setLoading(s => ({ ...s, overview: false })), 600);
    const t2 = setTimeout(() => setLoading(s => ({ ...s, charts: false })), 1100);
    const t3 = setTimeout(() => setLoading(s => ({ ...s, players: false })), 1500);
    const t4 = setTimeout(() => setLoading(s => ({ ...s, periods: false })), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [matchId]);

  const teamAvg = useMemo(() => genSeries(90, 10), [matchId]);

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="bg-zinc-900/60 border border-zinc-800">
        <TabsTrigger value="overview" className="gap-2"><BarChart3 className="h-4 w-4" />Overview</TabsTrigger>
        <TabsTrigger value="players" className="gap-2"><Users2 className="h-4 w-4" />Jugadores</TabsTrigger>
        <TabsTrigger value="periods" className="gap-2"><Clock3 className="h-4 w-4" />Periodos</TabsTrigger>
      </TabsList>

      {/* Overview */}
      <TabsContent value="overview" className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading.overview ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : (
            <>
              <KPI title="Distancia total (km)" value="108.4" hint="Promedio de equipo" />
              <KPI title="Velocidad media (km/h)" value="9.8" hint="90'" />
              <KPI title="Sprints (HSR)" value="67" hint=">19.8 km/h" />
              <KPI title="Top speed (km/h)" value="33.1" hint="Jugador más rápido" />
            </>
          )}
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm text-zinc-400">Velocidad media del equipo vs tiempo</CardTitle>
          </CardHeader>
          <CardContent className="h-60">
            {loading.charts ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={teamAvg} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="currentColor" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="currentColor" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-800" />
                  <XAxis dataKey="t" tick={{ fontSize: 12, fill: "#a1a1aa" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#a1a1aa" }} domain={[0, 36]} />
                  <RTooltip contentStyle={{ background: "#0a0a0a", border: "1px solid #27272a", borderRadius: 8 }} labelStyle={{ color: "#d4d4d8" }} />
                  <Area type="monotone" dataKey="speed" stroke="currentColor" fill="url(#grad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Players */}
      <TabsContent value="players" className="mt-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm text-zinc-400">Jugadores seleccionados · Velocidad instantánea</CardTitle>
          </CardHeader>
          <CardContent>
            {loading.players ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-28" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {PLAYERS.map((p) => (
                  <PlayerCard key={p.id} player={p} onOpen={() => onOpenPlayer(p.id)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Periods */}
      <TabsContent value="periods" className="mt-4">
        {loading.periods ? (
          <Skeleton className="h-48" />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {matchPeriods.map((p) => (
              <Card key={p.key} className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{p.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-zinc-400">Inicio: {p.start}</div>
                  <div className="text-sm text-zinc-400">Fin: {p.end}</div>
                  <div className="mt-2">
                    <div className="text-xs text-zinc-500 mb-2">Duración</div>
                    <div className="h-2 w-full rounded bg-zinc-800">
                      <div className="h-2 rounded bg-zinc-300" style={{ width: `${Math.min(100, (p.seconds / (46 * 60)) * 100)}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function PlayerCard({ player, onOpen }: any) {
  const data = playerSeries[player.id].slice(0, 40);
  const last = data[data.length - 1]?.speed ?? 0;
  const max = Math.max(...data.map(d => d.speed));
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer" onClick={onOpen}>
        <CardHeader className="pb-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{player.name}</CardTitle>
            <Badge variant="outline" className="border-zinc-700 text-zinc-400">{player.position}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 2, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="t" hide />
                <YAxis hide domain={[0, 36]} />
                <Line type="monotone" dot={false} dataKey="speed" stroke="currentColor" strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-1"><Activity className="h-3 w-3" />Inst: {last.toFixed(1)} km/h</div>
            <div>Máx: {max.toFixed(1)} km/h</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ------------------------------------------------------------
// Player Sheet — micro view
// ------------------------------------------------------------
function PlayerSheet({ open, onOpenChange, playerId }: { open: boolean; onOpenChange: (v: boolean) => void; playerId?: string }) {
  const player = useMemo(() => PLAYERS.find(p => p.id === playerId), [playerId]);
  const series = playerId ? playerSeries[playerId] : [];
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, [open, playerId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[92vw] sm:max-w-[720px] bg-zinc-950 text-zinc-100 border-l border-zinc-800 p-0">
        <SheetHeader className="px-6 py-4 border-b border-zinc-800">
          <SheetTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5" /> {player?.name}
            <Badge variant="outline" className="border-zinc-700 text-zinc-400 ml-2">{player?.position}</Badge>
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-full">
          <div className="p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {loading ? (
                <>
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </>
              ) : (
                <>
                  <KPI title="Minutos" value="89" />
                  <KPI title="Distancia (km)" value="10.4" />
                  <KPI title="Sprints" value="12" hint=">19.8 km/h" />
                  <KPI title="Top speed" value="32.8 km/h" />
                </>
              )}
            </div>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm text-zinc-400">Velocidad vs tiempo</CardTitle>
              </CardHeader>
              <CardContent className="h-60">
                {loading ? (
                  <Skeleton className="h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-800" />
                      <XAxis dataKey="t" tick={{ fontSize: 12, fill: "#a1a1aa" }} />
                      <YAxis tick={{ fontSize: 12, fill: "#a1a1aa" }} domain={[0, 36]} />
                      <RTooltip contentStyle={{ background: "#0a0a0a", border: "1px solid #27272a", borderRadius: 8 }} labelStyle={{ color: "#d4d4d8" }} />
                      <Line type="monotone" dot={false} dataKey="speed" stroke="currentColor" strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-zinc-400">Peores escenarios (Worst Cases)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <>
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                  </>
                ) : (
                  <div className="grid gap-2">
                    {["10:14:22 a 10:15:22 — 54.3 m", "10:46:14 a 10:47:14 — 55.1 m", "12:47:10 a 12:48:10 — 71.4 m"].map((txt, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-sm">
                        <div className="flex items-center gap-2"><Clock3 className="h-4 w-4" />{txt}</div>
                        <Badge className="bg-zinc-800 text-zinc-300">HSR ≥ 19.8</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ------------------------------------------------------------
// Main Component
// ------------------------------------------------------------
export default function App() {
  const [view, setView] = useState<"league" | "match">("league");
  const [tournament, setTournament] = useState("apertura");
  const [openPlayer, setOpenPlayer] = useState<string | undefined>();
  const [currentMatch, setCurrentMatch] = useState<string | undefined>();
  const [loadingMatch, setLoadingMatch] = useState(false);

  function openMatch(id: string) {
    setLoadingMatch(true);
    setView("match");
    // Simulate initial load delay for match-scoped resources
    setCurrentMatch(undefined);
    setTimeout(() => {
      setCurrentMatch(id);
      setLoadingMatch(false);
    }, 900);
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
          <TopBar
            onBack={() => setView("league")}
            view={view}
            tournament={tournament}
            setTournament={setTournament}
          />

          <AnimatePresence mode="wait">
            {view === "league" ? (
              <motion.div key="league" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="md:col-span-3 space-y-4">
                    <LeagueView onOpenMatch={openMatch} />
                  </div>
                  <aside className="space-y-3">
                    <Card className="bg-zinc-900/50 border-zinc-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-zinc-400">Rivales del torneo</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-2">
                        {TEAMS.map((t) => (
                          <Button key={t.id} variant="outline" className="justify-start bg-zinc-900/50 border-zinc-800">
                            <span className="mr-2">{t.crest}</span>{t.name}
                          </Button>
                        ))}
                      </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/50 border-zinc-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-zinc-400">Filtros rápidos</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-2">
                        {["W", "D", "L", "Local", "Visita", ">19.8 km/h", ">25.2 km/h"].map((f) => (
                          <Badge key={f} variant="secondary" className="bg-zinc-800 text-zinc-200">{f}</Badge>
                        ))}
                      </CardContent>
                    </Card>
                  </aside>
                </div>
              </motion.div>
            ) : (
              <motion.div key="match" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-zinc-400">
                    <Flag className="h-4 w-4" /> Partido: {currentMatch ?? "cargando…"}
                    {loadingMatch && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  <AnimatePresence mode="wait">
                    {currentMatch ? (
                      <motion.div key={currentMatch} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <MatchView matchId={currentMatch} onOpenPlayer={setOpenPlayer} />
                      </motion.div>
                    ) : (
                      <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Skeleton className="h-24 mb-4" />
                        <Skeleton className="h-60" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <PlayerSheet open={!!openPlayer} onOpenChange={() => setOpenPlayer(undefined)} playerId={openPlayer} />
      </div>
    </TooltipProvider>
  );
}


