import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Trash2, Pencil, ArrowUpDown, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

function exportToCSV(intervals, mode) {
  const isCharging = mode === 'charging';
  let csv = 'Interval #,Timestamp,LMP ($/MWh),Power MW,Energy MWh,';
  csv += isCharging ? 'Cost ($)' : 'Revenue ($)';
  csv += ',Running Total ($),Notes\n';
  intervals.forEach(i => {
    const ts = i.timestamp ? new Date(i.timestamp).toLocaleString() : '';
    csv += `${i.interval_num},"${ts}",${(i.lmp||0).toFixed(2)},${i.power_mw},${(i.energy_mwh||0).toFixed(4)},${Math.abs(i.cost_revenue||0).toFixed(2)},${(i.running_total||0).toFixed(2)},"${(i.notes||'').replace(/"/g,'""')}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `interval_log_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function IntervalTable({ intervals, onAdd, onEdit, onDelete, mode }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('interval_num');
  const [sortDir, setSortDir] = useState(1);
  const [editDialog, setEditDialog] = useState(null);
  const [addDialog, setAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({ lmp: '', notes: '' });

  const isCharging = mode === 'charging';

  const sorted = useMemo(() => {
    let list = intervals || [];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(i => 
        i.node?.toLowerCase().includes(s) || 
        i.notes?.toLowerCase().includes(s) ||
        String(i.interval_num).includes(s)
      );
    }
    return [...list].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'number') return (av - bv) * sortDir;
      return String(av || '').localeCompare(String(bv || '')) * sortDir;
    });
  }, [intervals, search, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d * -1);
    else { setSortKey(key); setSortDir(1); }
  };

  const handleSaveEdit = () => {
    if (editDialog) {
      onEdit(editDialog.interval_num, editDialog);
      setEditDialog(null);
    }
  };

  const handleAdd = () => {
    const lmp = parseFloat(addForm.lmp);
    if (isNaN(lmp)) return;
    onAdd(lmp, addForm.notes);
    setAddDialog(false);
    setAddForm({ lmp: '', notes: '' });
  };

  const SortHeader = ({ label, field }) => (
    <TableHead 
      className="cursor-pointer hover:bg-secondary/50 text-xs whitespace-nowrap select-none"
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">{label} <ArrowUpDown className="w-3 h-3 opacity-40" /></span>
    </TableHead>
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm font-semibold">Interval Log</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  className="h-8 pl-7 w-40 text-xs"
                />
              </div>
              {onAdd && (
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setAddDialog(true)}>
                  <Plus className="w-3 h-3 mr-1" /> Manual
                </Button>
              )}
              {intervals?.length > 0 && (
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => exportToCSV(intervals, mode)}>
                  <Download className="w-3 h-3 mr-1" /> Export
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader label="#" field="interval_num" />
                  <SortHeader label="Timestamp" field="timestamp" />
                  <SortHeader label="LMP ($/MWh)" field="lmp" />
                  <SortHeader label="Power MW" field="power_mw" />
                  <SortHeader label="Energy MWh" field="energy_mwh" />
                  <SortHeader label={isCharging ? "Cost ($)" : "Revenue ($)"} field="cost_revenue" />
                  <SortHeader label="Running Total" field="running_total" />
                  <TableHead className="text-xs">Notes</TableHead>
                  {onEdit && <TableHead className="text-xs w-16">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                      No intervals recorded yet
                    </TableCell>
                  </TableRow>
                ) : sorted.map(i => (
                  <TableRow key={i.interval_num} className="text-xs">
                    <TableCell className="font-mono font-medium">{i.interval_num}</TableCell>
                    <TableCell className="font-mono whitespace-nowrap text-xs">{i.timestamp ? new Date(i.timestamp).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}</TableCell>
                    <TableCell className={`font-mono font-medium ${i.lmp >= 0 ? '' : 'text-destructive'}`}>${(i.lmp || 0).toFixed(2)}</TableCell>
                    <TableCell className="font-mono">{i.power_mw}</TableCell>
                    <TableCell className="font-mono">{(i.energy_mwh || 0).toFixed(4)}</TableCell>
                    <TableCell className={`font-mono font-medium ${isCharging ? 'text-primary' : 'text-accent'}`}>
                      ${Math.abs(i.cost_revenue || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-mono font-medium">${(i.running_total || 0).toFixed(2)}</TableCell>
                    <TableCell className="max-w-[100px] truncate">{i.notes || '-'}</TableCell>
                    {onEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <button onClick={() => setEditDialog({...i})} className="p-1 hover:text-primary"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => onDelete(i.interval_num)} className="p-1 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Interval #{editDialog?.interval_num}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">LMP ($/MWh)</Label>
              <Input type="number" step="0.01" value={editDialog?.lmp || ''} onChange={e => setEditDialog({...editDialog, lmp: parseFloat(e.target.value)})} className="mt-1 font-mono" />
            </div>
            <div>
              <Label className="text-xs">Power MW</Label>
              <Input type="number" step="0.1" value={editDialog?.power_mw || ''} onChange={e => setEditDialog({...editDialog, power_mw: parseFloat(e.target.value)})} className="mt-1 font-mono" />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input value={editDialog?.notes || ''} onChange={e => setEditDialog({...editDialog, notes: e.target.value})} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Manual Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Manual Interval</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">LMP ($/MWh)</Label>
              <Input type="number" step="0.01" value={addForm.lmp} onChange={e => setAddForm({...addForm, lmp: e.target.value})} className="mt-1 font-mono" placeholder="Enter LMP price" />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input value={addForm.notes} onChange={e => setAddForm({...addForm, notes: e.target.value})} className="mt-1" placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Interval</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}