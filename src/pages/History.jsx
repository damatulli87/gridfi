import React, { useState } from 'react';
import { Cycle } from '@/api/cycleService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Download, Trash2, Copy, Eye, Clock
} from "lucide-react";
import { Link, useNavigate } from 'react-router-dom';
import { exportCycleToExcel } from '@/lib/excelExport';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import IntervalTable from '@/components/dashboard/IntervalTable';
import { toast } from 'sonner';
import GridFiLogo from '@/components/GridFiLogo';

export default function History() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [viewCycle, setViewCycle] = React.useState(null);

  const { data: completedCycles, isLoading } = useQuery({
    queryKey: ['cycles', 'completed'],
    queryFn: () => Cycle.filter({ status: 'completed' }, '-created_date'),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Cycle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      toast.success('Cycle deleted');
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: (cycle) => Cycle.create({
      name: `${cycle.name} (copy)`,
      date: new Date().toISOString().split('T')[0],
      node: cycle.node,
      mode: cycle.mode,
      power_mw: cycle.power_mw,
      status: 'active',
      start_time: new Date().toISOString(),
      intervals: [],
      notes: cycle.notes
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      toast.success('Cycle duplicated and started');
      navigate('/');
    }
  });

  const reopenMutation = useMutation({
    mutationFn: (id) => Cycle.update(id, { status: 'active', end_time: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      toast.success('Cycle re-opened');
      navigate('/');
    }
  });

  const stats = (cycle) => {
    const intervals = cycle.intervals || [];
    const totalMwh = intervals.reduce((s, i) => s + (i.energy_mwh || 0), 0);
    const total = intervals.length > 0 ? intervals[intervals.length - 1].running_total : 0;
    return { totalMwh, total, count: intervals.length };
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <GridFiLogo size={28} />
          <div>
            <h1 className="text-lg font-bold leading-none">GridFi</h1>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Cycle History</p>
          </div>
          <Badge variant="secondary" className="text-xs">{completedCycles.length} cycles</Badge>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto p-4">
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-muted-foreground text-sm">Loading...</div>
            ) : completedCycles.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">No completed cycles yet</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Node</TableHead>
                      <TableHead className="text-xs">Mode</TableHead>
                      <TableHead className="text-xs">Power MW</TableHead>
                      <TableHead className="text-xs">Intervals</TableHead>
                      <TableHead className="text-xs">Total MWh</TableHead>
                      <TableHead className="text-xs">Total $/Rev</TableHead>
                      <TableHead className="text-xs">Duration</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedCycles.map(cycle => {
                      const s = stats(cycle);
                      const dur = cycle.start_time && cycle.end_time ? (() => {
                        const ms = new Date(cycle.end_time) - new Date(cycle.start_time);
                        const mins = Math.floor(ms / 60000);
                        const hrs = Math.floor(mins / 60);
                        return hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
                      })() : '-';
                      return (
                        <TableRow key={cycle.id} className="text-xs">
                          <TableCell className="font-medium">{cycle.name}</TableCell>
                          <TableCell className="font-mono">{cycle.date}</TableCell>
                          <TableCell className="font-mono">{cycle.node}</TableCell>
                          <TableCell>
                            <Badge variant={cycle.mode === 'charging' ? 'default' : 'secondary'} className={`text-[10px] ${cycle.mode === 'discharging' ? 'bg-accent text-accent-foreground' : ''}`}>
                              {cycle.mode}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">{cycle.power_mw}</TableCell>
                          <TableCell className="font-mono">{s.count}</TableCell>
                          <TableCell className="font-mono">{s.totalMwh.toFixed(4)}</TableCell>
                          <TableCell className={`font-mono font-medium ${cycle.mode === 'charging' ? 'text-primary' : 'text-accent'}`}>
                            ${Math.abs(s.total).toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono">{dur}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View" onClick={() => setViewCycle(cycle)}>
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Export" onClick={() => exportCycleToExcel(cycle)}>
                                <Download className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Duplicate" onClick={() => duplicateMutation.mutate(cycle)}>
                                <Copy className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Re-open" onClick={() => reopenMutation.mutate(cycle.id)}>
                                <Clock className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" title="Delete" onClick={() => deleteMutation.mutate(cycle.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* View Dialog */}
      <Dialog open={!!viewCycle} onOpenChange={() => setViewCycle(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewCycle?.name} — {viewCycle?.node}</DialogTitle>
          </DialogHeader>
          {viewCycle && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs block">Mode</span><span className="font-medium capitalize">{viewCycle.mode}</span></div>
                <div><span className="text-muted-foreground text-xs block">Power</span><span className="font-mono font-medium">{viewCycle.power_mw} MW</span></div>
                <div><span className="text-muted-foreground text-xs block">Intervals</span><span className="font-mono font-medium">{(viewCycle.intervals || []).length}</span></div>
                <div><span className="text-muted-foreground text-xs block">Total</span><span className="font-mono font-medium">${Math.abs(stats(viewCycle).total).toFixed(2)}</span></div>
              </div>
              <IntervalTable intervals={viewCycle.intervals || []} mode={viewCycle.mode} />
              <Button className="w-full" onClick={() => exportCycleToExcel(viewCycle)}>
                <Download className="w-4 h-4 mr-2" /> Export to Excel
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}