"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface SeriesPoint {
  label: string;
  value: number;
}

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
