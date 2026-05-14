import React from 'react';
import { Card } from "@/components/ui/card";

export default function StatCard({ label, value, icon: Icon, accent, sub, className = '' }) {
  return (
    <Card className={`relative overflow-hidden p-4 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{label}</p>
          <p className={`text-xl font-bold mt-1 font-mono truncate ${accent || 'text-foreground'}`}>
            {value}
          </p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-secondary shrink-0">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>
    </Card>
  );
}