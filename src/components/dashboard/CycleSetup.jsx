import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Square, RotateCcw, Pencil, Check, X } from "lucide-react";
import NodePicker from './NodePicker';

export default function CycleSetup({ nodes, activeCycle, onStart, onPause, onResume, onEnd, onUpdateMw, onUpdateMode }) {
  const [form, setForm] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    node: '',
    mode: 'charging',
    power_mw: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [editingMw, setEditingMw] = useState(false);
  const [mwInput, setMwInput] = useState('');

  const validate = () => {
    const e = {};
    if (!form.node) e.node = 'Node required';
    if (!form.power_mw || parseFloat(form.power_mw) <= 0) e.power_mw = 'Positive MW required';
    if (!form.name.trim()) e.name = 'Name required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStart = () => {
    if (!validate()) return;
    onStart({
      ...form,
      power_mw: parseFloat(form.power_mw),
      start_time: new Date().toISOString(),
      status: 'active',
      intervals: []
    });
  };

  const isActive = activeCycle?.status === 'active';
  const isPaused = activeCycle?.status === 'paused';
  const hasActive = isActive || isPaused;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          {hasActive && <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse-glow' : 'bg-yellow-500'}`} />}
          {hasActive ? `Cycle: ${activeCycle.name}` : 'New Cycle'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasActive ? (
          <>
            <div>
              <Label className="text-xs">Cycle Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Morning Charge Run"
                className="h-9 text-sm mt-1"
              />
              {errors.name && <p className="text-xs text-destructive mt-0.5">{errors.name}</p>}
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="h-9 text-sm mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">ERCOT Node</Label>
              <div className="mt-1">
                <NodePicker nodes={nodes} value={form.node} onChange={v => setForm({ ...form, node: v })} />
              </div>
              {errors.node && <p className="text-xs text-destructive mt-0.5">{errors.node}</p>}
            </div>
            <div>
              <Label className="text-xs">Mode</Label>
              <Select value={form.mode} onValueChange={v => setForm({ ...form, mode: v })}>
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="charging">⚡ Charging</SelectItem>
                  <SelectItem value="discharging">💰 Discharging</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Power Command (MW)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={form.power_mw}
                onChange={e => setForm({ ...form, power_mw: e.target.value })}
                placeholder="e.g. 20"
                className="h-9 text-sm mt-1 font-mono"
              />
              {errors.power_mw && <p className="text-xs text-destructive mt-0.5">{errors.power_mw}</p>}
            </div>
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="text-sm mt-1 h-16 resize-none"
                placeholder="Optional notes..."
              />
            </div>
            <Button className="w-full h-11 text-sm font-semibold" onClick={handleStart}>
              <Play className="w-4 h-4 mr-2" /> Start Cycle
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Node:</span> <span className="font-mono font-medium">{activeCycle.node}</span></div>
              <div><span className="text-muted-foreground">Intervals:</span> <span className="font-mono font-medium">{activeCycle.intervals?.length || 0}</span></div>
            </div>
            {/* Mode toggle */}
            <div>
              <Label className="text-xs">Mode</Label>
              <div className="flex gap-1 mt-1">
                {['charging', 'idle', 'discharging'].map(m => (
                  <Button
                    key={m}
                    size="sm"
                    variant={activeCycle.mode === m ? 'default' : 'outline'}
                    className={`flex-1 h-8 text-xs capitalize ${activeCycle.mode === m && m === 'charging' ? 'bg-primary' : activeCycle.mode === m && m === 'discharging' ? 'bg-accent text-accent-foreground' : ''}`}
                    onClick={() => activeCycle.mode !== m && onUpdateMode(m)}
                  >
                    {m === 'charging' ? '⚡' : m === 'idle' ? '⏸' : '💰'} {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            {/* MW Command — always visible */}
            <div>
              <Label className="text-xs">Power Command (MW)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={editingMw ? mwInput : activeCycle.power_mw}
                  onChange={e => { setMwInput(e.target.value); setEditingMw(true); }}
                  className="h-9 text-sm font-mono"
                  placeholder="MW"
                />
                <Button
                  size="sm"
                  className="h-9 px-3 shrink-0"
                  onClick={() => { const v = parseFloat(editingMw ? mwInput : activeCycle.power_mw); if (v > 0) { onUpdateMw(v); setEditingMw(false); } }}
                >
                  <Check className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Cost/Rev = LMP × MW ÷ 12 per interval</p>
            </div>
            <div className="flex gap-2 pt-2">
              {isActive ? (
                <Button variant="secondary" className="flex-1 h-10 text-sm" onClick={onPause}>
                  <Pause className="w-4 h-4 mr-1" /> Pause
                </Button>
              ) : (
                <Button variant="secondary" className="flex-1 h-10 text-sm" onClick={onResume}>
                  <RotateCcw className="w-4 h-4 mr-1" /> Resume
                </Button>
              )}
              <Button variant="destructive" className="flex-1 h-10 text-sm" onClick={onEnd}>
                <Square className="w-4 h-4 mr-1" /> End Cycle
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}