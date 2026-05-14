import React from 'react';
import { Card } from "@/components/ui/card";

export default function StatCard({ label, value, icon: Icon, accent, sub, className = '' }) {
  return (
    <Card className={`relative overflow-hidden p-3 ${className}`}>
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide leading-tight">{label}</p>
          <p className={`text-base font-bold mt-1 font-mono leading-tight ${accent || 'text-foreground'}`}>
            {value}
          </p>
          {sub && <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{sub}</p>}
        </div>
        {Icon && (
          <div className="p-1.5 rounded-md bg-secondary shrink-0 mt-0.5">
            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        )}
      </div>
    </Card>
  );
}