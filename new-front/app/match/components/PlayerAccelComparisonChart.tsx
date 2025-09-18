"use client";

import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

export interface AccelerationRowForChart {
	id: number;
	player_display_name: string;
	values: number[]; // [Total Accels, Accel Low, Accel Med, Accel High, Total Decels, Decel Low, Decel Med, Decel High, Distance (m), Time (s)]
}

interface PlayerAccelComparisonChartProps {
	rows: AccelerationRowForChart[];
	maxPlayers?: number;
}

function buildChartData(rows: AccelerationRowForChart[], maxPlayers: number) {
	const limited = rows.slice(0, Math.max(0, maxPlayers));
	return limited.map((r) => ({
		player: r.player_display_name,
		acc_total: r.values?.[0] ?? 0,
		acc_low: r.values?.[1] ?? 0,
		acc_med: r.values?.[2] ?? 0,
		acc_high: r.values?.[3] ?? 0,
		dec_total: r.values?.[4] ?? 0,
		dec_low: r.values?.[5] ?? 0,
		dec_med: r.values?.[6] ?? 0,
		dec_high: r.values?.[7] ?? 0,
	}));
}

export default function PlayerAccelComparisonChart({ rows, maxPlayers = 12 }: PlayerAccelComparisonChartProps) {
	const data = React.useMemo(() => buildChartData(rows || [], maxPlayers), [rows, maxPlayers]);

	return (
		<div className="h-[260px]">
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
					<XAxis dataKey="player" tick={{ fontSize: 12, fill: '#a1a1aa' }} angle={-20} textAnchor="end" interval={0} height={50} stroke="#3f3f46" />
					<YAxis tick={{ fontSize: 12, fill: '#a1a1aa' }} stroke="#3f3f46" />
					<Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #27272a', borderRadius: 8 }} labelStyle={{ color: '#e4e4e7' }} itemStyle={{ color: '#e4e4e7' }} />
					<Legend wrapperStyle={{ color: '#a1a1aa' }} />

					{/* Group 1: Total Accels -> stacked by low/med/high */}
					<Bar dataKey="acc_low" stackId="acc" name="Accel Low" fill="#86efac" />
					<Bar dataKey="acc_med" stackId="acc" name="Accel Med" fill="#22c55e" />
					<Bar dataKey="acc_high" stackId="acc" name="Accel High" fill="#16a34a" />

					{/* Group 2: Total Decels -> stacked by low/med/high */}
					<Bar dataKey="dec_low" stackId="dec" name="Decel Low" fill="#fecaca" />
					<Bar dataKey="dec_med" stackId="dec" name="Decel Med" fill="#f87171" />
					<Bar dataKey="dec_high" stackId="dec" name="Decel High" fill="#dc2626" />
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
