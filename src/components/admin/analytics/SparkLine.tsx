"use client";

import * as React from "react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

/** Мини-линия без осей для KPI-плиток. */
export function SparkLine({ points, height = 36 }: { points: number[]; height?: number }) {
  if (!points || points.length < 2) return <div style={{ height }} />;
  const data = points.map((value, i) => ({ i, value }));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line type="monotone" dataKey="value" stroke="#1d1d1f" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
