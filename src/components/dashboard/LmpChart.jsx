import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function LmpChart({ intervals }) {
  if (!intervals || intervals.length < 2) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">LMP Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center text-sm text-muted-foreground">
          Need at least 2 intervals for chart
        </CardContent>
      </Card>
    );
  }

  const data = intervals.map(i => ({
    name: `#${i.interval_num}`,
    lmp: i.lmp,
    cost: Math.abs(i.cost_revenue || 0),
  }));

  const avgLmp = data.reduce((s, d) => s + d.lmp, 0) / data.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">LMP Trend</CardTitle>
      </CardHeader>
      <CardContent className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
            <Tooltip 
              formatter={(v) => [`$${v.toFixed(2)}`, 'LMP']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
            />
            <ReferenceLine y={avgLmp} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
            <Line 
              type="monotone" 
              dataKey="lmp" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2} 
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}