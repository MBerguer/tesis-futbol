"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Mail, Phone, User, Ruler, Activity } from "lucide-react";

export default function PlayerProfile() {
  // Ejemplo de datos (usar los que tienes en el PDF)
  const player = {
    name: "Acosta Facundo",
    alias: "facundo acosta",
    edad: 19,
    fechaNacimiento: "15/04/2006",
    documento: "55862728",
    celular: "94677431",
    email: "facundoacosta.conve10@gmail.com",
    posicion: "Lateral Izquierdo",
    masaPliegues: "F0 - Sumatoria 6 pliegues",
    relacionMH: "Relación músculo-hueso",
    salto: "Medición salto (curva y=x²)",
    distanciaMax: "4013 m",
    hsrMax: "1653 m",
    velocidadMax: "27 km/h",
    highMetabDist: "z6",
  };

  const rendimiento = [
    { name: "Page A", hsr: 100, distancia: 220 },
    { name: "Page B", hsr: 200, distancia: 300 },
  ];

  const bloqueAdq = [
    { factor: "Recuperación", valor: -5 },
    { factor: "Tensión", valor: -4 },
    { factor: "Duración", valor: -3 },
    { factor: "Velocidad", valor: -2 },
    { factor: "Bajo HSR", valor: -1 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <Card className="rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <User className="w-6 h-6 text-blue-500" />
            {player.name}{" "}
            <Badge variant="secondary" className="ml-2">{player.posicion}</Badge>
          </CardTitle>
          <p className="text-muted-foreground">Alias: {player.alias}</p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Edad:</strong> {player.edad}</p>
            <p><strong>Fecha Nacimiento:</strong> {player.fechaNacimiento}</p>
            <p><strong>Documento:</strong> {player.documento}</p>
          </div>
          <div>
            <p className="flex items-center gap-2"><Phone size={16}/> {player.celular}</p>
            <p className="flex items-center gap-2"><Mail size={16}/> {player.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de información */}
      <Tabs defaultValue="fisico" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="fisico">Mediciones</TabsTrigger>
          <TabsTrigger value="rendimiento">Rendimiento</TabsTrigger>
          <TabsTrigger value="adq">Bloque Adquisición</TabsTrigger>
        </TabsList>

        {/* Mediciones físicas */}
        <TabsContent value="fisico">
          <Card>
            <CardHeader>
              <CardTitle>Mediciones Físicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><Ruler className="inline-block w-4 h-4 mr-2 text-green-500"/>{player.masaPliegues}</p>
              <p>{player.relacionMH}</p>
              <p>{player.salto}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rendimiento */}
        <TabsContent value="rendimiento">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento en Campo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p><Activity className="inline-block w-4 h-4 mr-2 text-red-500"/>Distancia Máx: {player.distanciaMax}</p>
              <p>HSR Máx: {player.hsrMax}</p>
              <p>Velocidad Máx: {player.velocidadMax}</p>
              <p>High Metabolic Dist: {player.highMetabDist}</p>
              <Separator className="my-2"/>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={rendimiento}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hsr" fill="#2563eb" name="HSR" />
                  <Bar dataKey="distancia" fill="#16a34a" name="Distancia" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bloque adquisición */}
        <TabsContent value="adq">
          <Card>
            <CardHeader>
              <CardTitle>Bloque de Adquisición</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={bloqueAdq}>
                  <XAxis dataKey="factor"/>
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="valor" stroke="#f97316" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}