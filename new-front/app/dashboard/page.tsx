"use client";

import React, { useState } from "react";
import personsData from "./data/fotos_path.json"; // Import local JSON file

import { CardTitle, CardHeader, CardContent, Card } from "./components/ui/card";
import { AvatarImage, AvatarFallback, Avatar } from "./components/ui/avatar";
import { Button } from "./components/ui/button";
import { Key } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ComposedChart,
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
}

const data = [
  { name: "Page A", uv: 400, pv: 2400, amt: 2400 },
  { name: "Page B", uv: 300, pv: 1398, amt: 2210 },
  // Agrega más datos aquí
];

const databloque = [
  { day: "-5", distanciaTotal: 5709, distanciaHML: 801, promedioHSR: 213 },
  { day: "-4", distanciaTotal: 5008, distanciaHML: 595, promedioHSR: 151 },
  { day: "-3", distanciaTotal: 4981, distanciaHML: 686, promedioHSR: 159 },
  { day: "-2", distanciaTotal: 5201, distanciaHML: 552, promedioHSR: 185 },
  { day: "-1", distanciaTotal: 2751, distanciaHML: 250, promedioHSR: 36 },
  // Agrega más datos aquí
];

export default function Page() {
  const [persons, setPersons] = useState<Person[]>(personsData);

  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const handlePersonClick = (person: Person) => {
    setSelectedPerson(person);
  };
  return (
    <main className="flex flex-col lg:flex-row gap-6 p-4">
      <aside className="w-full lg:w-1/4">
        <Card>
          <CardHeader>
            <CardTitle>Plantel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-screen overflow-y-auto">
              <ul className="space-y-4">
                {persons.map((person: Person) => (
                  <li key={person.id}>
                    <Button
                      className="flex items-center gap-2"
                      onClick={() => handlePersonClick(person)}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          alt={person.nombre}
                          src={person.path_foto}
                        />
                        <AvatarFallback>{person.nombre[0]} </AvatarFallback>
                      </Avatar>
                      <span>{person.nombre}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </aside>
      <section className="w-full lg:w-3/4">
        {selectedPerson && (
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedPerson.nombre} /{" "}
                <a href="/equipo">{selectedPerson.categoria}</a>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-start">
              <div className="w-1/4">
                <Avatar className="h-96 w-full">
                  <AvatarImage
                    alt="Selected Person"
                    src={selectedPerson.path_foto}
                  />
                  <AvatarFallback>{selectedPerson.nombre[0]}</AvatarFallback>
                </Avatar>
              </div>
              <div className="ml-4">
                <h2 className="mt-4 text-xl font-semibold">
                  {selectedPerson.nombre}
                </h2>
                <p>Alias: {selectedPerson.alias}</p>
                <p>Age: {selectedPerson.edad}</p>
                <p>Personal Metrics: {selectedPerson.personalMetrics}</p>
              </div>
            </CardContent>
            <CardContent className="w-full mt-6">
              <div className="justify-between">
                <div className="flex gap-4">
                  <Card className="w-full lg:w-1/3 bg-blue-200">
                    <CardContent>
                      <h2 className="text-2xl font-bold">Masa F0</h2>
                      <p className="text-4xl font-bold">
                        {selectedPerson?.masaF0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="w-full lg:w-1/3 bg-green-200">
                    <CardContent>
                      <h2 className="text-2xl font-bold">
                        Sumatoria de 6 Pliegues
                      </h2>
                      <p className="text-4xl font-bold">
                        {selectedPerson?.sumatoriaPliegues}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="w-full lg:w-1/3 bg-yellow-200">
                    <CardContent>
                      <h2 className="text-2xl font-bold">
                        Relación Musculo-Hueso
                      </h2>
                      <p className="text-4xl font-bold">
                        {selectedPerson?.relacionMusculoHueso}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
            <CardContent className="w-full mt-6">
              <h2 className="text-2xl font-bold">Medición del Salto</h2>
              <div className="flex gap-4">
                <Card className="w-full lg:w-1/2">
                  <CardContent>
                    <h3 className="text-lg font-semibold my-4">
                      Curva: y = x^2
                    </h3>
                    <LineChart width={400} height={300} data={data}>
                      <Line type="monotone" dataKey="uv" stroke="#8884d8" />
                      <CartesianGrid stroke="#ccc" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                    </LineChart>
                  </CardContent>
                </Card>
                <Card className="w-full lg:w-1/2">
                  <CardContent>
                    <h3 className="text-lg font-semibold my-4">
                      Gráfica de Barras
                    </h3>
                    <BarChart
                      width={400}
                      height={300}
                      data={data}
                      layout="vertical"
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="pv" fill="#8884d8" />
                    </BarChart>
                  </CardContent>
                </Card>
              </div>
            </CardContent>

            <CardContent className="w-full mt-6">
              <div className="justify-between">
                <div className="flex gap-4">
                  <Card className="w-full lg:w-1/5 bg-red-200">
                    <CardContent
                      className="py-[5px] flex h-full"
                      style={{ flexFlow: "wrap row" }}
                    >
                      <div>
                        <h2 className="text-xl font-bold">Max. Dist</h2>
                        <p className="text-2xl font-bold">4.0</p>
                      </div>
                      <a
                        href="/match"
                        className="text-blue-600"
                        style={{
                          display: "inline-block",
                          alignSelf: "flex-end",
                        }}
                      >
                        2 Nac : Rac 3
                      </a>
                    </CardContent>
                  </Card>
                  <Card className="w-full lg:w-1/5 bg-blue-200">
                    <CardContent
                      className="py-[5px] flex h-full"
                      style={{ flexFlow: "wrap row" }}
                    >
                      <div>
                        <h2 className="text-xl font-bold">HSR Max</h2>
                        <p className="text-2xl font-bold">1.6</p>
                      </div>
                      <a
                        href="#"
                        className="text-blue-600"
                        style={{
                          display: "inline-block",
                          alignSelf: "flex-end",
                        }}
                      >
                        2 Nac : Rac 3
                      </a>
                    </CardContent>
                  </Card>
                  <Card className="w-full lg:w-1/5 bg-green-200">
                    <CardContent
                      className="py-[5px] flex h-full"
                      style={{ flexFlow: "wrap row" }}
                    >
                      <div>
                        <h2 className="text-xl font-bold">Velocidad Max.</h2>
                        <p className="text-2xl font-bold">3.7</p>
                      </div>
                      <a
                        href="#"
                        className="text-blue-600"
                        style={{
                          display: "inline-block",
                          alignSelf: "flex-end",
                        }}
                      >
                        2 Nac : Rac 3
                      </a>
                    </CardContent>
                  </Card>
                  <Card className="w-full lg:w-1/5 bg-yellow-200">
                    <CardContent
                      className="py-[5px] flex h-full"
                      style={{ flexFlow: "wrap row" }}
                    >
                      <div>
                        <h2 className="text-xl font-bold">High Metab. Dist.</h2>
                        <p className="text-2xl font-bold">0.55</p>
                      </div>
                      <a
                        href="#"
                        className="text-blue-600"
                        style={{
                          display: "inline-block",
                          alignSelf: "flex-end",
                        }}
                      >
                        2 Nac : Rac 3
                      </a>
                    </CardContent>
                  </Card>
                  <Card className="w-full lg:w-1/5 bg-purple-200">
                    <CardContent
                      className="py-[5px] flex h-full"
                      style={{ flexFlow: "wrap row" }}
                    >
                      <div>
                        <h2 className="text-xl font-bold">z6</h2>
                        <p className="text-2xl font-bold">15``</p>
                      </div>
                      <a
                        href="#"
                        className="text-blue-600"
                        style={{
                          display: "inline-block",
                          alignSelf: "flex-end",
                        }}
                      >
                        2 Nac : Rac 3
                      </a>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>

            <CardContent className="w-full mt-6">
              <h2 className="text-2xl font-bold">
                Bloque de Adquisicion del jugador
              </h2>
              <div className="flex gap-4">
                <Card className="w-full">
                  <CardContent>
                    <h3 className="text-lg font-semibold my-4">
                      Recuperacion (-5), Tension (-4), Duracion (-3), Velocidad
                      (-2), Bajo HSR (-1)
                    </h3>
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
          </Card>
        )}
      </section>
    </main>
  );
}
