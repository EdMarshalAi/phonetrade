"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface SeriesPoint {
  label: string;
  value: number;
}

/**
 * Recharts не умеет рендериться на сервере (нужны размеры контейнера) — на SSR
 * это валит страницу. Монтируем графики только на клиенте: до маунта отдаём
 * плейсхолдер нужной высоты, чтобы не было сдвига layout.
 */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** Монохромная палитра для donut/bar (оттенки ink). */
export const INK_SHADES = ["#1d1d1f", "#3a3a3c", "#56565a", "#727276", "#8e8e93", "#aeaeb2", "#c7c7cc", "#d8d8dc"];

/**
 * Минималистичный area-график на токенах (монохром, ink). Для выручки /
 * просмотров по дням. Высота фиксированная, адаптивная ширина.
 */
export function TimeSeriesChart({
  data,
  height = 220,
  valueFormatter,
}: {
  data: SeriesPoint[];
  height?: number;
  valueFormatter?: (v: number) => string;
}) {
  const mounted = useMounted();
  if (!mounted) return <div style={{ width: "100%", height }} />;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="inkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d1d1f" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#1d1d1f" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#86868b" }} tickLine={false} axisLine={{ stroke: "#d2d2d7" }} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={{ fontSize: 11, fill: "#86868b" }} tickLine={false} axisLine={false} width={44} tickFormatter={valueFormatter} />
          <Tooltip
            formatter={(value) => (valueFormatter ? valueFormatter(Number(value)) : String(value))}
            contentStyle={{ borderRadius: 10, border: "1px solid #d2d2d7", fontSize: 13, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            labelStyle={{ color: "#6e6e73" }}
          />
          <Area type="monotone" dataKey="value" stroke="#1d1d1f" strokeWidth={2} fill="url(#inkFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut (распределение по категориям/способам). data: {label, value}[]. */
export function DonutChart({
  data,
  height = 240,
  valueFormatter,
}: {
  data: SeriesPoint[];
  height?: number;
  valueFormatter?: (v: number) => string;
}) {
  const mounted = useMounted();
  if (!mounted) return <div style={{ width: "100%", height }} />;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius="55%" outerRadius="80%" paddingAngle={2} stroke="#fff" strokeWidth={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={INK_SHADES[i % INK_SHADES.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => (valueFormatter ? valueFormatter(Number(value)) : String(value))} contentStyle={{ borderRadius: 10, border: "1px solid #d2d2d7", fontSize: 13 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Горизонтальный/вертикальный bar. data: {label, value}[]. */
export function BarsChart({
  data,
  height = 240,
  horizontal = false,
  valueFormatter,
}: {
  data: SeriesPoint[];
  height?: number;
  horizontal?: boolean;
  valueFormatter?: (v: number) => string;
}) {
  const mounted = useMounted();
  if (!mounted) return <div style={{ width: "100%", height }} />;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 12, bottom: 0, left: horizontal ? 8 : 4 }}>
          {horizontal ? (
            <>
              <XAxis type="number" tick={{ fontSize: 11, fill: "#86868b" }} tickLine={false} axisLine={false} tickFormatter={valueFormatter} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: "#86868b" }} tickLine={false} axisLine={false} width={120} />
            </>
          ) : (
            <>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#86868b" }} tickLine={false} axisLine={{ stroke: "#d2d2d7" }} interval="preserveStartEnd" minTickGap={20} />
              <YAxis tick={{ fontSize: 11, fill: "#86868b" }} tickLine={false} axisLine={false} width={44} tickFormatter={valueFormatter} />
            </>
          )}
          <Tooltip formatter={(value) => (valueFormatter ? valueFormatter(Number(value)) : String(value))} cursor={{ fill: "rgba(0,0,0,0.03)" }} contentStyle={{ borderRadius: 10, border: "1px solid #d2d2d7", fontSize: 13 }} />
          <Bar dataKey="value" fill="#1d1d1f" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
