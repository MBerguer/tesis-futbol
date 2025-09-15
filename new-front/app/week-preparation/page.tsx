"use client";

import React from "react";
import personsData from "./data/merged_data.json"; // local JSON

import { CardTitle, CardHeader, CardContent, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ComposedChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";

interface Person {
  id: React.Key;
  nombre: string;
  categoria?: string;
}

const databloque = [
  { day: "-5", distanciaTotal: 5709, distanciaHML: 801, promedioHSR: 213 },
  { day: "-4", distanciaTotal: 5008, distanciaHML: 595, promedioHSR: 151 },
  { day: "-3", distanciaTotal: 4981, distanciaHML: 686, promedioHSR: 159 },
  { day: "-2", distanciaTotal: 5201, distanciaHML: 552, promedioHSR: 185 },
  { day: "-1", distanciaTotal: 2751, distanciaHML: 250, promedioHSR: 36 },
];

const data = [
  { name: "A", x: 12, y: 23, z: 122 },
  { name: "B", x: 22, y: 3, z: 73 },
  { name: "C", x: 13, y: 15, z: 32 },
  { name: "D", x: 44, y: 35, z: 23 },
  { name: "E", x: 35, y: 45, z: 20 },
  { name: "F", x: 62, y: 25, z: 29 },
  { name: "G", x: 37, y: 17, z: 61 },
  { name: "H", x: 28, y: 32, z: 45 },
  { name: "I", x: 19, y: 43, z: 93 },
];

export default function Page() {
  const persons = React.useMemo(() => personsData as unknown as Person[], []);
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    persons.forEach(p => { if (p.categoria) set.add((p.categoria as string).toLowerCase()); });
    return Array.from(set).sort((a,b)=>a.localeCompare(b));
  }, [persons]);

  const [selectedCategory, setSelectedCategory] = React.useState<string>("sub19");

  return (
    <main className="p-4 space-y-6">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle>Preparación del fin de semana</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat)=>{
              const active = selectedCategory === cat;
              return (
                <Button
                  key={cat}
                  size="sm"
                  variant={active?"default":"ghost"}
                  className={`${active?"bg-primary text-primary-foreground hover:bg-primary/90 ring-1 ring-primary/40":"border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/60 text-zinc-200"} capitalize`}
                  onClick={()=>setSelectedCategory(cat)}
                >
                  {cat}
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

          {/* KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="bg-zinc-900/60 border-zinc-800"><CardContent className="pt-4"><div className="text-xs text-zinc-400">Sub 16</div><div className="text-2xl font-semibold">—</div></CardContent></Card>
            <Card className="bg-zinc-900/60 border-zinc-800"><CardContent className="pt-4"><div className="text-xs text-zinc-400">Sub 17</div><div className="text-2xl font-semibold">—</div></CardContent></Card>
            <Card className="bg-zinc-900/60 border-zinc-800"><CardContent className="pt-4"><div className="text-xs text-zinc-400">Sub 19</div><div className="text-2xl font-semibold">—</div></CardContent></Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader><CardTitle className="text-base">Promedio de distancia total, HML y HSR (bloque)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[360px]">
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

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader><CardTitle className="text-base">Promedio de desaceleraciones z4-z6 y aceleraciones z4-z6</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                      <CartesianGrid stroke="#27272a" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="x" stackId="a" fill="#8884d8" />
                      <Bar dataKey="y" stackId="a" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Players table for selected category (placeholder) */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader><CardTitle className="text-base">Tabla de jugadores {selectedCategory?`· ${selectedCategory}`:""}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-400">
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Categoría</th>
                </tr>
              </thead>
              <tbody>
                {persons
                  .filter(p => !selectedCategory || (p.categoria || "").toLowerCase() === selectedCategory)
                  .slice(0, 20)
                  .map((p) => (
                    <tr key={p.id as any} className="border-t border-zinc-800">
                      <td className="px-3 py-2">{p.nombre}</td>
                      <td className="px-3 py-2 capitalize">{p.categoria}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
