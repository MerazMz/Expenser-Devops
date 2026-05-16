"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";

interface SavingsChartProps {
  data: {
    date: string;
    saved: number;
  }[];
}

export function SavingsChart({ data }: SavingsChartProps) {
  const chartHeight = 180;
  const chartWidth = 320;
  const padding = 30;

  // Calculate scales
  const { points, gridLines, xAxisLabels } = useMemo(() => {
    if (data.length === 0) return { points: "", gridLines: [], xAxisLabels: [] };

    const values = data.map((d) => d.saved);
    const minVal = Math.min(...values, -100); // Default min to -100 if all positive
    const maxVal = Math.max(...values, 300);  // Default max to 300
    const range = maxVal - minVal;

    const getX = (index: number) => (index / (data.length - 1)) * (chartWidth - padding * 2) + padding;
    const getY = (value: number) => chartHeight - padding - ((value - minVal) / range) * (chartHeight - padding * 2);

    const pointCoords = data.map((d, i) => ({
      x: getX(i),
      y: getY(d.saved),
      value: d.saved,
      date: d.date
    }));

    const pathData = pointCoords.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");

    // Grid lines for Y axis (e.g. -200, -100, 0, 100, 200, 300)
    const ySteps = [-200, -100, 0, 100, 200, 300];
    const gridLines = ySteps.map(val => ({
      y: getY(val),
      label: val,
      isVisible: val >= minVal && val <= maxVal || val === 0
    }));

    // X axis labels (start, middle, end)
    const xAxisLabels = [
      { x: getX(0), label: format(new Date(data[0].date), "d MMM") },
      { x: getX(Math.floor(data.length / 3)), label: format(new Date(data[Math.floor(data.length / 3)].date), "d MMM") },
      { x: getX(Math.floor(data.length * 2 / 3)), label: format(new Date(data[Math.floor(data.length * 2 / 3)].date), "d MMM") },
      { x: getX(data.length - 1), label: format(new Date(data[data.length - 1].date), "d MMM") },
    ];

    return { points: pathData, pointCoords, gridLines, xAxisLabels };
  }, [data]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card p-4">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-auto overflow-visible"
      >
        {/* Grid Lines */}
        {gridLines.map((line, i) => (
          <g key={i}>
            <line
              x1={padding}
              y1={line.y}
              x2={chartWidth - padding}
              y2={line.y}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-foreground opacity-10"
              strokeDasharray="2 2"
            />
            <text
              x={padding - 10}
              y={line.y + 3}
              textAnchor="end"
              className="text-[8px] fill-foreground/70 font-mono"
            >
              {line.label}
            </text>
          </g>
        ))}

        {/* X Axis Labels */}
        {xAxisLabels.map((label, i) => (
          <text
            key={i}
            x={label.x}
            y={chartHeight - 5}
            textAnchor="middle"
            className="text-[8px] fill-foreground/70 font-mono"
          >
            {label.label}
          </text>
        ))}

        {/* The Line */}
        <motion.path
          d={points}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Points */}
        {points && data.map((d, i) => {
          const x = (i / (data.length - 1)) * (chartWidth - padding * 2) + padding;
          const minVal = Math.min(...data.map(d => d.saved), -100);
          const maxVal = Math.max(...data.map(d => d.saved), 300);
          const range = maxVal - minVal;
          const y = chartHeight - padding - ((d.saved - minVal) / range) * (chartHeight - padding * 2);

          return (
            <motion.circle
              key={i}
              cx={x}
              cy={y}
              r="2.5"
              className="fill-primary stroke-card stroke-1"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + i * 0.05 }}
            />
          );
        })}
      </svg>
    </div>
  );
}
