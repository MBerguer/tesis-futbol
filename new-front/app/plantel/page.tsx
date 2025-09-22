"use client";

import React from "react";
import personsData from "./data/merged_data.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "./components/ui/avatar";
import { useServerPhotoBlocks } from "../hooks/useServerPhotoBlocks";
import { Mail, Phone, Smartphone, User, Ruler, Activity, Calendar, FileText, Stamp, HeartPulse, GraduationCap, MapPin, Building2, Percent, Tag, List as ListIcon } from "lucide-react";
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

type Person = (typeof personsData)[number];

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
  const [selectedCategory, setSelectedCategory] = React.useState<string>("sub19");
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const { isBlocked, block, unblock, getCustomUrl, uploadCustom, deleteCustom } = useServerPhotoBlocks(API_BASE);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  const persons = React.useMemo(() => personsData as Person[], []);
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    (persons as Person[]).forEach(p => { if (p.categoria) set.add((p.categoria as string).toLowerCase()); });
    return Array.from(set).sort((a,b)=>a.localeCompare(b));
  }, [persons]);
  const list = React.useMemo(() => {
    const f = filter.trim().toLowerCase();
    let arr = persons as Person[];
    if (selectedCategory) arr = arr.filter(p => (p.categoria || "").toLowerCase() === selectedCategory);
    if (!f) return arr;
    return arr.filter(p => `${p.Jugador} ${p.nombre} ${p.categoria} ${p.Posicion}`.toLowerCase().includes(f));
  }, [persons, filter, selectedCategory]);

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

  // Keyboard navigation
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isTyping) return;
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      if (!list || list.length === 0) return;
      e.preventDefault();
      const currentId = (selectedPerson?.id as any);
      const idx = currentId != null ? list.findIndex(p => p.id === currentId) : -1;
      let next = idx;
      if (e.key === 'ArrowDown') next = Math.min(list.length - 1, idx + 1);
      if (e.key === 'ArrowUp') next = Math.max(0, idx - 1);
      if (next >= 0 && next < list.length) {
        const np = list[next];
        setSelectedPerson(np);
        const container = listRef.current;
        if (container) {
          const el = container.querySelector(`[data-player-id="${(np.id as any)}"]`);
          if (el && (el as HTMLElement).scrollIntoView) {
            (el as HTMLElement).scrollIntoView({ block: 'nearest' });
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [list, selectedPerson?.id]);

  return (
    <main className="flex flex-col lg:flex-row gap-6 p-4">
      <aside className="w-full lg:w-1/4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle>Plantel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="sticky top-0 z-10 mb-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                {categories.map((cat)=>{
                  const active = selectedCategory === cat;
                  const label = cat;
                  return (
                    <Button
                      key={cat}
                      size="sm"
                      variant={active?"default":"ghost"}
                      className={`capitalize ${active?"bg-primary text-primary-foreground hover:bg-primary/90 ring-1 ring-primary/40":"border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/60 text-zinc-200"}`}
                      onClick={()=> setSelectedCategory(cat)}>
                      {label}
                    </Button>
                  );
                })}
                <Button
                  size="sm"
                  variant={selectedCategory?"ghost":"default"}
                  className={`${selectedCategory?"border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/60 text-zinc-200":"bg-primary text-primary-foreground hover:bg-primary/90 ring-1 ring-primary/40"}`}
                  onClick={()=>setSelectedCategory("")}
                >
                  Todos
                </Button>
              </div>
              <input
                type="text"
                placeholder="Buscar jugador…"
                value={filter}
                onChange={(e)=>setFilter(e.target.value)}
                className="w-full h-9 rounded-md bg-zinc-900/60 border border-zinc-800 px-3 text-sm"
              />
            </div>
            <div className="h-[70vh] overflow-y-auto pr-1" ref={listRef}>
              <ul className="space-y-2">
                {list.map((person) => (
                  <li key={person.id as any}>
                    <Button
                      variant={selectedPerson?.id === person.id ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start gap-2 h-auto py-2 border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/60"
                      onClick={() => setSelectedPerson(person)}
                      data-player-id={(person.id as any)}
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage alt={person.Jugador} src={(() => {
                          const pid = (typeof (person as any).id === 'number' ? (person as any).id : (typeof (person as any).Documento_de_Identidad === 'number' ? (person as any).Documento_de_Identidad : undefined));
                          const custom = getCustomUrl(pid);
                          if (custom) return custom;
                          const path = person.path_foto || undefined;
                          if (isBlocked(pid, path)) return undefined;
                          return path;
                        })()} />
                        <AvatarFallback>{(person.Jugador || person.nombre || "?").slice(0,1)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <div className="text-sm truncate">{person.Jugador || person.nombre}</div>
                        <div className="text-[11px] text-zinc-400 truncate">{person.Posicion || "—"}</div>
                      </div>
                      <Badge variant="outline" className="ml-auto capitalize border-zinc-700 bg-zinc-900/60 text-zinc-200">{person.categoria || ""}</Badge>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </aside>

      <section className="w-full lg:w-3/4">
        {!selectedPerson ? (
          <Card className="bg-zinc-900/50 border-zinc-800"><CardHeader><CardTitle>Selecciona un jugador</CardTitle></CardHeader></Card>
        ) : (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <User className="w-5 h-5" />
                <span className="truncate">{selectedPerson.Jugador || selectedPerson.nombre}</span>
                <Badge variant="secondary" className="ml-2 capitalize">{selectedPerson.categoria || ""}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/3">
                <Avatar className="w-full h-auto rounded-md overflow-hidden">
                  <AvatarImage alt={selectedPerson.Jugador} src={(() => {
                    const pid = (typeof (selectedPerson as any).id === 'number' ? (selectedPerson as any).id : (typeof (selectedPerson as any).Documento_de_Identidad === 'number' ? (selectedPerson as any).Documento_de_Identidad : undefined));
                    const custom = getCustomUrl(pid);
                    if (custom) return custom;
                    const path = selectedPerson.path_foto || undefined;
                    if (isBlocked(pid, path)) return undefined;
                    return path;
                  })()} className="aspect-auto w-full h-auto object-contain bg-zinc-900" />
                  <AvatarFallback className="h-72 text-3xl">{(selectedPerson.Jugador || selectedPerson.nombre || "?").slice(0,1)}</AvatarFallback>
                </Avatar>
                <div className="mt-2 flex gap-2">
                  {(() => {
                    const pid = typeof selectedPerson.id === 'number' ? selectedPerson.id : (typeof (selectedPerson as any).Documento_de_Identidad === 'number' ? (selectedPerson as any).Documento_de_Identidad : undefined);
                    const path = selectedPerson.path_foto || undefined;
                    const blocked = isBlocked(pid, path);
                    return !blocked ? (
                      <Button size="sm" variant="destructive" className="h-7" onClick={() => block(pid, path)}>Quitar foto</Button>
                    ) : (
                      <Button size="sm" variant="default" className="h-7" onClick={() => unblock(pid, path)}>Restaurar foto</Button>
                    );
                  })()}
                  {(() => {
                    const pid = typeof selectedPerson.id === 'number' ? selectedPerson.id : (typeof (selectedPerson as any).Documento_de_Identidad === 'number' ? (selectedPerson as any).Documento_de_Identidad : undefined);
                    const custom = getCustomUrl(pid);
                    if (!custom) {
                      return (
                        <label className="inline-flex items-center gap-2 cursor-pointer text-xs px-2 py-1 border border-zinc-700 rounded hover:bg-zinc-800/50">
                          <input type="file" accept="image/*" className="hidden" onChange={async (e)=>{
                            const inputEl = e.currentTarget;
                            const file = inputEl.files?.[0];
                            if (file && pid != null) await uploadCustom(pid, file);
                            inputEl.value = "";
                          }} />
                          Subir foto
                        </label>
                      );
                    }
                    return (
                      <Button size="sm" variant="destructive" className="h-7" onClick={async ()=>{ if (pid != null) await deleteCustom(pid); }}>Eliminar foto</Button>
                    );
                  })()}
                </div>
              </div>
              <div className="md:flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex items-center gap-2"><User className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Alias:</span> {selectedPerson.nombre || "—"}</div>
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Edad:</span> {calcAge(selectedPerson.Fecha_Nacimiento) ?? "—"}</div>
                  <div className="flex items-center gap-2"><Tag className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Posición:</span> {selectedPerson.Posicion || "—"}</div>
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Fecha Nac.:</span> {selectedPerson.Fecha_Nacimiento || "—"}</div>
                  <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Documento:</span> {selectedPerson.Documento_de_Identidad ?? "—"}</div>
                  <div className="flex items-center gap-2"><Stamp className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Pasaporte:</span> {selectedPerson.Pasaporte || "—"}</div>
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Teléfono:</span> {selectedPerson.Telefono || "—"}</div>
                  <div className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Celular:</span> {selectedPerson.Celular || "—"}</div>
                  <div className="sm:col-span-2 flex items-center gap-2"><Mail className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Email:</span> {selectedPerson.Email || "—"}</div>
                  <div className="sm:col-span-2 flex items-center gap-2"><HeartPulse className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Cobertura Médica:</span> {selectedPerson.Cobertura_Medica || "—"}</div>
                  <div className="sm:col-span-2 flex items-center gap-2"><GraduationCap className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Estudios:</span> {selectedPerson.Estudios || "—"}</div>
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Oriundo:</span> {selectedPerson.Oriundo || "—"}</div>
                  <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Club de Origen:</span> {selectedPerson.Club_de_Origen || "—"}</div>
                  <div className="flex items-center gap-2"><Percent className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">% Origen:</span> {selectedPerson.Club_de_Origen_Porcentaje || "—"}</div>
                  <div className="sm:col-span-2 flex items-center gap-2"><ListIcon className="h-4 w-4 text-zinc-400"/><span className="text-zinc-400">Medidas personales:</span> {selectedPerson.personalMetrics || "—"}</div>
                </div>

                <Separator className="my-4 bg-zinc-800" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Card className="bg-zinc-900/60 border-zinc-800">
                    <CardContent className="pt-4">
                      <div className="text-xs text-zinc-400">Masa F0</div>
                      <div className="text-2xl font-semibold">{selectedPerson.masaF0 || "—"}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-zinc-900/60 border-zinc-800">
                    <CardContent className="pt-4">
                      <div className="text-xs text-zinc-400">Sumatoria 6 Pliegues</div>
                      <div className="text-2xl font-semibold">{selectedPerson.sumatoriaPliegues || "—"}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-zinc-900/60 border-zinc-800">
                    <CardContent className="pt-4">
                      <div className="text-xs text-zinc-400">Relación Músculo-Hueso</div>
                      <div className="text-2xl font-semibold">{selectedPerson.relacionMusculoHueso || "—"}</div>
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
                {[
                  { title: "Max. Dist", value: "4013 m", link: "/match" },
                  { title: "HSR Max", value: "1653 m" },
                  { title: "Velocidad Max.", value: "27 km/h" },
                  { title: "High Metab. Dist.", value: "550 m" },
                  { title: "z6", value: "15\" (229m)" },
                ].map((kpi) => (
                  <Card key={kpi.title} className="bg-zinc-900/60 border-zinc-800">
                    <CardContent className="py-3">
                      <div className="text-sm text-zinc-300">{kpi.title}</div>
                      <div className="text-xl font-semibold">{kpi.value}</div>
                      {kpi.link ? (
                        <a href={kpi.link} className="text-xs text-blue-400 hover:underline">ver detalles</a>
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