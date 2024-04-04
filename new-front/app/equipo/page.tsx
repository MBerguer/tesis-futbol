"use client";

import React, { useEffect, useState } from "react";
import personsData from "./data/merged_data.json"; // Import local JSON file

import { CardTitle, CardHeader, CardContent, Card } from "./components/ui/card";
import { AvatarImage, AvatarFallback, Avatar } from "./components/ui/avatar";
import { Button } from "./components/ui/button";
import { Key } from "react";
import {
  ComposedChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { BarChart, Bar, Legend } from "recharts";

interface Person {
  id: Key;
  nombre: string;
  path_foto: string | undefined;
  categoria: string | undefined;
  alias: string | undefined;
  edad: number | undefined;
  personalMetrics: string | undefined;
  masaF0: string | undefined;
  sumatoriaPliegues: string | undefined;
  relacionMusculoHueso: string | undefined;
  Jugador: string | undefined;
  Fecha_Nacimiento: string | undefined;
  Documento_de_Identidad: number | undefined | null;
  Pasaporte: string | undefined;
  Telefono: string | undefined;
  Celular: string | undefined;
  Email: string | undefined;
  Cobertura_Medica: string | undefined;
  Estudios: string | undefined;
  Oriundo: string | undefined;
  Club_de_Origen: string | undefined;
  Club_de_Origen_Porcentaje: string | undefined;
  Posicion: string | undefined;
}

const databloque = [
  { day: "-5", distanciaTotal: 5709, distanciaHML: 801, promedioHSR: 213 },
  { day: "-4", distanciaTotal: 5008, distanciaHML: 595, promedioHSR: 151 },
  { day: "-3", distanciaTotal: 4981, distanciaHML: 686, promedioHSR: 159 },
  { day: "-2", distanciaTotal: 5201, distanciaHML: 552, promedioHSR: 185 },
  { day: "-1", distanciaTotal: 2751, distanciaHML: 250, promedioHSR: 36 },
  // Agrega más datos aquí
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
  const [persons, setPersons] = useState<Person[]>(personsData);

  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const handlePersonClick = (person: Person) => {
    setSelectedPerson(person);
  };

  const [domLoaded, setDomLoaded] = useState(false);

  useEffect(() => {
    setDomLoaded(true);
  }, []);

  return (
    <main className="flex flex-col lg:flex-row gap-6 p-4">
      <aside className="w-full lg:w-1/4">
        <Card>
          <CardHeader>
            <CardTitle>Menu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-screen overflow-y-auto">
              <ul className="space-y-4">
                <li>
                  <a href="/dashboard" className="text-blue-600">
                    {" "}
                    Dashboard
                  </a>
                </li>
                <li>
                  <a href="/match" className="text-blue-600">
                    {" "}
                    Partido
                  </a>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </aside>
      <section className="w-full lg:w-3/4">
        <Card>
          {domLoaded && (
            <CardContent className="w-full mt-6">
              <h1 className="text-2xl font-bold mb-2">
                Análisis por categoria
              </h1>

              <div className="justify-between">
                <div className="flex gap-4">
                  <Card className="w-full lg:w-1/3 bg-blue-200">
                    <CardContent>
                      <h2 className="text-2xl font-bold">Sub 16</h2>
                      <p className="text-4xl font-bold">
                        {selectedPerson?.masaF0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="w-full lg:w-1/3 bg-green-200">
                    <CardContent>
                      <h2 className="text-2xl font-bold">Sub 17</h2>
                      <p className="text-4xl font-bold">
                        {selectedPerson?.sumatoriaPliegues}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="w-full lg:w-1/3 bg-yellow-200">
                    <CardContent>
                      <h2 className="text-2xl font-bold">Sub19</h2>
                      <p className="text-4xl font-bold">
                        {selectedPerson?.relacionMusculoHueso}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          )}
          {domLoaded && (
            <CardContent className="w-full mt-6">
              <h3 className="text-lg font-bold">
                Promedio de distancia total, promedio de distancia HML y
                promedio de high speed running absoluto por mes y dia
              </h3>
              <div className="flex gap-4">
                <Card className="w-full">
                  <CardContent>
                    <h5 className="text-sm font-semibold my-4">
                      Recuperacion (-5), Tension (-4), Duracion (-3), Velocidad
                      (-2), Bajo HSR (-1)
                    </h5>
                    <ComposedChart width={1000} height={500} data={databloque}>
                      {/* { day: "-5", distanciaTotal: 5709, distanciaHML: 801 }, */}
                      <XAxis dataKey="day" />
                      <YAxis
                        yAxisId={1}
                        orientation="right"
                        label={{ value: "Distancia Total", angle: -90 }}
                      />
                      <Tooltip />
                      <Legend />
                      <CartesianGrid stroke="#f5f5f5" />
                      <Bar
                        yAxisId={1}
                        dataKey="distanciaTotal"
                        barSize={40}
                        fill="#413ea0"
                      />
                      <Bar
                        yAxisId={1}
                        dataKey="distanciaHML"
                        barSize={40}
                        fill="#049be5"
                      />
                      <YAxis
                        yAxisId={2}
                        label={{ value: "Promedio HSR", angle: -90 }}
                        padding={{ top: 200, bottom: 20 }}
                      />
                      <Line
                        yAxisId={2}
                        type="monotone"
                        dataKey="promedioHSR"
                        stroke="#000"
                        dot={true}
                      />
                    </ComposedChart>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          )}
          {domLoaded && (
            <CardContent className="w-full mt-6">
              <h3 className="text-lg font-bold">
                Promedio de desaceleracion z4 y z6 y promedio de aceleraciones
                z4 a z6 por año mes y dia
              </h3>
              <div className="flex gap-4">
                <Card className="w-full">
                  <CardContent>
                    <BarChart width={1000} height={500} data={data}>
                      <CartesianGrid />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Bar dataKey="x" stackId="a" fill="#8884d8" />
                      <Bar dataKey="y" stackId="a" fill="#82ca9d" />
                    </BarChart>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          )}
          {domLoaded && (
            <CardContent className="w-full mt-6">
              <h3 className="text-lg font-bold">Tabla de jugadores</h3>
              <div className="flex gap-4">
                <table className="table-auto">
                  <thead>
                    <th className="px-4 py-2">Nombre</th>
                    <th className="px-4 py-2">Categoria</th>
                    <th className="px-4 py-2">Suma de Distancia Total</th>
                    <th className="px-4 py-2">Suma de HML</th>
                    <th className="px-4 py-2">Suma de acc z4 a z6</th>
                    <th className="px-4 py-2">Suma de decc z6 a z4</th>
                    <th className="px-4 py-2">Promedio de Max Acc.</th>
                    <th className="px-4 py-2">Suma de HSR</th>
                  </thead>
                  <tbody>
                    {persons
                      .filter((person) => person.categoria === "sub16")
                      .map((person) => (
                        <tr>
                          <td className="border px-4 py-2">{person.nombre}</td>
                          <td className="border px-4 py-2">
                            {person.categoria}
                          </td>
                          <td className="border px-4 py-2">{person.edad}</td>
                          <td className="border px-4 py-2">{person.alias}</td>
                          <td className="border px-4 py-2">{person.alias}</td>
                          <td className="border px-4 py-2">{person.alias}</td>
                          <td className="border px-4 py-2">{person.alias}</td>
                          <td className="border px-4 py-2">{person.alias}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      </section>
    </main>
  );
}
