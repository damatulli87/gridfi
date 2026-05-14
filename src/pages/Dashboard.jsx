import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Cycle } from '@/api/cycleService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  RefreshCw, Zap, MapPin, Gauge, DollarSign, TrendingUp, TrendingDown,
  BarChart3, Clock, Activity, Timer, Wifi, WifiOff, AlertTriangle,
  Sun, Moon
} from "lucide-react";
import StatCard from '@/components/dashboard/StatCard';
import CycleSetup from '@/components/dashboard/CycleSetup';
import LmpChart from '@/components/dashboard/LmpChart';
import IntervalTable from '@/components/dashboard/IntervalTable';
import { addRecent, initDarkMode, setDarkMode, getDarkMode } from '@/lib/ercotStore';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [dark, setDark] = useState(initDarkMode());
  const [activeCycle, setActiveCycle] = useState(null);
  const [currentLmp, setCurrentLmp] = useState(null);
  const [ercotLastUpdate, setErcotLastUpdate] = useState(null);
  const [ercotNodes, setErcotNodes] = useState([]);
  const [ercotError, setErcotError] = useState(null);
  const [ercotLoading, setErcotLoading] = useState(false);
  const intervalRef = useRef(null);
  const cycleIntervalRef = useRef(null);
  const lastRecordedErcotTimestamp = useRef(null);
  const lastRecordedLmp = useRef(null);
  const lastAutoRecordedAt = useRef(null); // wall-clock time of last auto-record
  // Always-current ref so fetchErcot never has a stale closure over activeCycle
  const activeCycleRef = useRef(null);
  useEffect(() => { activeCycleRef.current = activeCycle; }, [activeCycle]);

  // Fetch ERCOT data — stable callback, reads activeCycle via ref
  const fetchErcot = useCallback(async () => {
    setErcotLoading(true);
    setErcotError(null);
    try {
      const res = await fetch('/api/scrape-ercot');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setErcotNodes(data.nodes || []);
      const newTimestamp = data.lastUpdated;
      setErcotLastUpdate(data.lastUpdated || data.fetchedAt);

      const cycle = activeCycleRef.current;
      if (cycle?.node) {
        const node = data.nodes?.find(n => n.name === cycle.node);
        if (node) {
          const newLmp = node.lmp;
          setCurrentLmp(newLmp);
          // Seed lastRecordedLmp on first fetch
          if (lastRecordedLmp.current === null) {
            lastRecordedLmp.current = newLmp;
          }
          const timestampChanged = newTimestamp && newTimestamp !== lastRecordedErcotTimestamp.current;
          const priceChanged = newLmp !== lastRecordedLmp.current;
          // Enforce 4-min cooldown between auto-records — ERCOT page can refresh timestamp
          // multiple times per 5-min settlement interval, causing spurious duplicates
          const MIN_AUTO_INTERVAL_MS = 4 * 60 * 1000;
          const cooldownOk = !lastAutoRecordedAt.current ||
            (Date.now() - lastAutoRecordedAt.current) >= MIN_AUTO_INTERVAL_MS;
          if (cycle.status === 'active' && (timestampChanged || priceChanged) && cooldownOk) {
            lastRecordedErcotTimestamp.current = newTimestamp;
            lastRecordedLmp.current = newLmp;
            lastAutoRecordedAt.current = Date.now();
            const intervals = [...(cycle.intervals || [])];
            const num = intervals.length + 1;
            const energy = cycle.power_mw / 12;
            const costRev = cycle.mode === 'charging'
              ? -(newLmp * cycle.power_mw / 12)
              : (newLmp * cycle.power_mw / 12);
            const prevTotal = intervals.length > 0 ? intervals[intervals.length - 1].running_total : 0;
            const newInterval = {
              interval_num: num,
              timestamp: new Date().toISOString(),
              node: cycle.node,
              lmp: newLmp,
              mode: cycle.mode,
              power_mw: cycle.power_mw,
              duration_min: 5,
              energy_mwh: energy,
              cost_revenue: costRev,
              running_total: prevTotal + costRev,
              notes: ''
            };
            intervals.push(newInterval);
            const updated = { ...cycle, intervals };
            setActiveCycle(updated);
            activeCycleRef.current = updated;
            saveCycleMutation.mutate({ id: cycle.id, data: { intervals } });
            toast.success(`Interval #${num} recorded: $${newLmp.toFixed(2)}/MWh`);
          }
        }
      }
    } catch (e) {
      setErcotError('Failed to fetch ERCOT data');
    } finally {
      setErcotLoading(false);
    }
  }, []); // stable — no deps needed, uses refs

  // Auto-refresh ERCOT every 30s
  useEffect(() => {
    fetchErcot();
    intervalRef.current = setInterval(fetchErcot, 30000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Load active cycle from DB
  const { data: cycles } = useQuery({
    queryKey: ['cycles', 'active'],
    queryFn: () => Cycle.filter({ status: 'active' }),
    initialData: [],
  });

  const { data: pausedCycles } = useQuery({
    queryKey: ['cycles', 'paused'],
    queryFn: () => Cycle.filter({ status: 'paused' }),
    initialData: [],
  });

  useEffect(() => {
    const active = cycles[0] || pausedCycles[0];
    if (active && !activeCycle) {
      setActiveCycle(active);
      const node = ercotNodes.find(n => n.name === active.node);
      if (node) setCurrentLmp(node.lmp);
    }
  }, [cycles, pausedCycles, ercotNodes]);



  const saveCycleMutation = useMutation({
    mutationFn: ({ id, data }) => Cycle.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
    },
    onError: (e) => toast.error(`Save failed: ${e.message}`)
  });

  const createCycleMutation = useMutation({
    mutationFn: (data) => Cycle.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      setActiveCycle(created);
      toast.success('Cycle started');
    },
    onError: (e) => toast.error(`Failed to start cycle: ${e.message}`)
  });

  const recordInterval = useCallback(() => {
    if (!activeCycle || activeCycle.status !== 'active') return;
    const lmp = currentLmp;
    if (lmp === null || lmp === undefined) {
      toast.error('No LMP data available');
      return;
    }
    const intervals = [...(activeCycle.intervals || [])];
    const num = intervals.length + 1;
    const energy = activeCycle.power_mw / 12; // 5-min interval = MW/12 MWh
    // Charging = cost (negative), Discharging = revenue (positive)
    const costRev = activeCycle.mode === 'charging' ? -(lmp * activeCycle.power_mw / 12) : (lmp * activeCycle.power_mw / 12);
    const prevTotal = intervals.length > 0 ? intervals[intervals.length - 1].running_total : 0;

    const newInterval = {
      interval_num: num,
      timestamp: new Date().toISOString(),
      node: activeCycle.node,
      lmp,
      mode: activeCycle.mode,
      power_mw: activeCycle.power_mw,
      duration_min: 5,
      energy_mwh: energy,
      cost_revenue: costRev,
      running_total: prevTotal + costRev,
      notes: ''
    };

    intervals.push(newInterval);
    const updated = { ...activeCycle, intervals };
    setActiveCycle(updated);
    saveCycleMutation.mutate({ id: activeCycle.id, data: { intervals } });
    toast.success(`Interval #${num} recorded: $${lmp.toFixed(2)}/MWh`);
  }, [activeCycle, currentLmp]);

  const handleStartCycle = (form) => {
    addRecent(form.node);
    createCycleMutation.mutate(form);
    const node = ercotNodes.find(n => n.name === form.node);
    if (node) setCurrentLmp(node.lmp);
  };

  const handlePause = () => {
    if (!activeCycle) return;
    const updated = { ...activeCycle, status: 'paused' };
    setActiveCycle(updated);
    saveCycleMutation.mutate({ id: activeCycle.id, data: { status: 'paused' } });
    toast('Cycle paused');
  };

  const handleResume = () => {
    if (!activeCycle) return;
    const updated = { ...activeCycle, status: 'active' };
    setActiveCycle(updated);
    saveCycleMutation.mutate({ id: activeCycle.id, data: { status: 'active' } });
    toast.success('Cycle resumed');
  };

  const handleUpdateMw = (newMw) => {
    if (!activeCycle) return;
    const updated = { ...activeCycle, power_mw: newMw };
    setActiveCycle(updated);
    saveCycleMutation.mutate({ id: activeCycle.id, data: { power_mw: newMw } });
    toast.success(`Power command updated to ${newMw} MW`);
  };

  const handleEnd = () => {
    if (!activeCycle) return;
    const endData = { status: 'completed', end_time: new Date().toISOString() };
    saveCycleMutation.mutate({ id: activeCycle.id, data: endData });
    setActiveCycle(null);
    setCurrentLmp(null);
    queryClient.invalidateQueries({ queryKey: ['cycles'] });
    toast.success('Cycle completed');
  };

  const handleAddManual = (lmp, notes) => {
    if (!activeCycle) return;
    const intervals = [...(activeCycle.intervals || [])];
    const num = intervals.length + 1;
    const energy = activeCycle.power_mw / 12; // 5-min interval = MW/12 MWh
    // Charging = cost (negative), Discharging = revenue (positive)
    const costRev = activeCycle.mode === 'charging' ? -(lmp * activeCycle.power_mw / 12) : (lmp * activeCycle.power_mw / 12);
    const prevTotal = intervals.length > 0 ? intervals[intervals.length - 1].running_total : 0;

    intervals.push({
      interval_num: num,
      timestamp: new Date().toISOString(),
      node: activeCycle.node,
      lmp,
      mode: activeCycle.mode,
      power_mw: activeCycle.power_mw,
      duration_min: 5,
      energy_mwh: energy,
      cost_revenue: costRev,
      running_total: prevTotal + costRev,
      notes: notes || 'Manual entry'
    });

    const updated = { ...activeCycle, intervals };
    setActiveCycle(updated);
    saveCycleMutation.mutate({ id: activeCycle.id, data: { intervals } });
    toast.success('Manual interval added');
  };

  const handleEditInterval = (num, edited) => {
    if (!activeCycle) return;
    let intervals = [...(activeCycle.intervals || [])];
    const idx = intervals.findIndex(i => i.interval_num === num);
    if (idx < 0) return;

    // Recalculate from edited point
    const energy = edited.power_mw / 12; // MW/12 = MWh per 5-min interval
    const costRev = edited.mode === 'charging' ? -(edited.lmp * edited.power_mw / 12) : (edited.lmp * edited.power_mw / 12);
    intervals[idx] = { ...intervals[idx], ...edited, energy_mwh: energy, cost_revenue: costRev };

    // Recalc running totals
    let total = 0;
    intervals.forEach(i => {
      total += i.cost_revenue;
      i.running_total = total;
    });

    const updated = { ...activeCycle, intervals };
    setActiveCycle(updated);
    saveCycleMutation.mutate({ id: activeCycle.id, data: { intervals } });
    toast.success('Interval updated');
  };

  const handleDeleteInterval = (num) => {
    if (!activeCycle) return;
    let intervals = (activeCycle.intervals || []).filter(i => i.interval_num !== num);
    // Renumber and recalc
    let total = 0;
    intervals = intervals.map((i, idx) => {
      total += i.cost_revenue;
      return { ...i, interval_num: idx + 1, running_total: total };
    });
    const updated = { ...activeCycle, intervals };
    setActiveCycle(updated);
    saveCycleMutation.mutate({ id: activeCycle.id, data: { intervals } });
    toast.success('Interval deleted');
  };

  // Computed stats
  const intervals = activeCycle?.intervals || [];
  const totalMwh = intervals.reduce((s, i) => s + (i.energy_mwh || 0), 0);
  const totalCostRev = intervals.length > 0 ? intervals[intervals.length - 1].running_total : 0;
  const lmps = intervals.map(i => i.lmp).filter(v => !isNaN(v));
  const avgLmp = lmps.length ? lmps.reduce((a, b) => a + b, 0) / lmps.length : 0;
  const highLmp = lmps.length ? Math.max(...lmps) : 0;
  const lowLmp = lmps.length ? Math.min(...lmps) : 0;
  const isCharging = activeCycle?.mode === 'charging';
  const costRevLabel = isCharging ? 'Cost' : 'Revenue';

  // Trend
  const trend = lmps.length >= 2 ? (lmps[lmps.length - 1] > lmps[lmps.length - 2] ? 'up' : 'down') : null;

  // Cycle duration
  const cycleDuration = activeCycle?.start_time ? (() => {
    const ms = Date.now() - new Date(activeCycle.start_time).getTime();
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(mins / 60);
    return hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
  })() : '-';

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    setDarkMode(next);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/gridfi-logo.png" alt="GridFi" className="h-9 w-auto" />
            <p className="text-[10px] text-muted-foreground leading-none self-end mb-0.5">ERCOT LMP Tracker</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={ercotError ? 'destructive' : 'secondary'} className="text-xs gap-1">
              {ercotError ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
              {ercotError ? 'Offline' : `${ercotNodes.length} nodes`}
            </Badge>
            <Button variant="ghost" size="sm" onClick={fetchErcot} disabled={ercotLoading} className="h-8 w-8 p-0">
              <RefreshCw className={`w-4 h-4 ${ercotLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Link to="/history">
              <Button variant="ghost" size="sm" className="h-8 text-xs">History</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={toggleDark} className="h-8 w-8 p-0">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4">
        {/* ERCOT Status Bar */}
        {ercotError && (
          <div className="mb-4 bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{ercotError}. You can still add manual LMP entries.</span>
            <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={fetchErcot}>Retry</Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* Left Panel - Cycle Setup */}
          <div className="space-y-4">
            <CycleSetup
              nodes={ercotNodes}
              activeCycle={activeCycle}
              onStart={handleStartCycle}
              onPause={handlePause}
              onResume={handleResume}
              onEnd={handleEnd}
              onUpdateMw={handleUpdateMw}
            />
            {activeCycle && <LmpChart intervals={intervals} />}
            {/* Record Now button */}
            {activeCycle?.status === 'active' && (
              <Button className="w-full h-12 text-sm font-semibold" onClick={recordInterval}>
                <Timer className="w-4 h-4 mr-2" /> Record Interval Now
              </Button>
            )}
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              <StatCard
                label="Current LMP"
                value={currentLmp !== null ? `$${currentLmp.toFixed(2)}` : '--'}
                icon={DollarSign}
                accent={currentLmp !== null ? (currentLmp >= 0 ? '' : 'text-destructive') : ''}
                sub={trend === 'up' ? '↑ Rising' : trend === 'down' ? '↓ Falling' : null}
              />
              <StatCard label="Node" value={activeCycle?.node || '--'} icon={MapPin} />
              <StatCard label="Power Command" value={activeCycle ? `${activeCycle.power_mw} MW` : '--'} icon={Gauge} />
              <StatCard
                label={`Interval ${costRevLabel}`}
                value={intervals.length > 0 ? `$${Math.abs(intervals[intervals.length - 1].cost_revenue || 0).toFixed(2)}` : '--'}
                icon={isCharging ? TrendingDown : TrendingUp}
                accent={isCharging ? 'text-primary' : 'text-accent'}
              />
              <StatCard
                label={`Total ${costRevLabel}`}
                value={intervals.length > 0 ? `$${Math.abs(totalCostRev).toFixed(2)}` : '--'}
                icon={DollarSign}
                accent={isCharging ? 'text-primary' : 'text-accent'}
              />
              <StatCard label="Avg LMP" value={avgLmp ? `$${avgLmp.toFixed(2)}` : '--'} icon={BarChart3} />
              <StatCard label="Total MWh" value={totalMwh ? totalMwh.toFixed(4) : '--'} icon={Zap} />
              <StatCard label="Intervals" value={intervals.length || '0'} icon={Activity} />
              <StatCard label="Start Time" value={activeCycle?.start_time ? new Date(activeCycle.start_time).toLocaleTimeString() : '--'} icon={Clock} sub={activeCycle?.start_time ? Intl.DateTimeFormat().resolvedOptions().timeZone : null} />
              <StatCard label="Duration" value={cycleDuration} icon={Timer} />
              <StatCard 
                label="Mode" 
                value={activeCycle?.mode ? activeCycle.mode.charAt(0).toUpperCase() + activeCycle.mode.slice(1) : '--'} 
                icon={Activity}
                accent={isCharging ? 'text-primary' : 'text-accent'}
              />
              <StatCard 
                label="ERCOT Update" 
                value={ercotLastUpdate ? ercotLastUpdate.replace(/.*\d{4}\s*/, '').trim() || ercotLastUpdate : '--'} 
                icon={Wifi}
                sub={ercotLoading ? 'Refreshing...' : 'Central Time (CT)'}
              />
            </div>

            {/* High/Low LMP */}
            {intervals.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Highest LMP" value={`$${highLmp.toFixed(2)}`} icon={TrendingUp} accent="text-destructive" />
                <StatCard label="Lowest LMP" value={`$${lowLmp.toFixed(2)}`} icon={TrendingDown} accent="text-accent" />
              </div>
            )}

            {/* Interval Table */}
            <IntervalTable
              intervals={intervals}
              mode={activeCycle?.mode || 'charging'}
              onAdd={activeCycle?.status === 'active' ? handleAddManual : null}
              onEdit={activeCycle ? handleEditInterval : null}
              onDelete={activeCycle ? handleDeleteInterval : null}
            />
          </div>
        </div>
      </main>
    </div>
  );
}