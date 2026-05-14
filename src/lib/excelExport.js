// Excel export using jspdf-like approach but with actual XLSX via simple XML
// We'll build a proper Excel file using the xlsx format

export function exportCycleToExcel(cycle) {
  const intervals = cycle.intervals || [];
  
  // Calculate summary stats
  const totalMwh = intervals.reduce((s, i) => s + (i.energy_mwh || 0), 0);
  const lmps = intervals.map(i => i.lmp).filter(v => !isNaN(v));
  const avgLmp = lmps.length ? lmps.reduce((a, b) => a + b, 0) / lmps.length : 0;
  const highLmp = lmps.length ? Math.max(...lmps) : 0;
  const lowLmp = lmps.length ? Math.min(...lmps) : 0;
  const totalCostRev = intervals.reduce((s, i) => s + (i.cost_revenue || 0), 0);
  
  const isCharging = cycle.mode === 'charging';
  const costRevLabel = isCharging ? 'Total Cost' : 'Total Revenue';
  
  // Build CSV (compatible with Excel)
  let csv = '';
  
  // Header section
  csv += 'ERCOT LMP Cycle Report\n';
  csv += '\n';
  csv += `Cycle Name,${cycle.name}\n`;
  csv += `Date,${cycle.date}\n`;
  csv += `Node,${cycle.node}\n`;
  csv += `Mode,${cycle.mode?.charAt(0).toUpperCase() + cycle.mode?.slice(1)}\n`;
  csv += `Power Command,${cycle.power_mw} MW\n`;
  csv += `Start Time,${cycle.start_time ? new Date(cycle.start_time).toLocaleString() : ''}\n`;
  csv += `End Time,${cycle.end_time ? new Date(cycle.end_time).toLocaleString() : ''}\n`;
  csv += '\n';
  
  // Summary section
  csv += 'SUMMARY\n';
  csv += `Total Energy MWh,${totalMwh.toFixed(4)}\n`;
  csv += `Average LMP ($/MWh),${avgLmp.toFixed(2)}\n`;
  csv += `Highest LMP ($/MWh),${highLmp.toFixed(2)}\n`;
  csv += `Lowest LMP ($/MWh),${lowLmp.toFixed(2)}\n`;
  csv += `Interval Count,${intervals.length}\n`;
  csv += `${costRevLabel},$${Math.abs(totalCostRev).toFixed(2)}\n`;
  csv += '\n';
  
  // Detail table
  csv += 'DETAILED INTERVALS\n';
  csv += 'Interval #,Timestamp,Node,LMP ($/MWh),Mode,Power MW,Duration (min),Energy MWh,Cost/Revenue ($),Running Total ($),Notes\n';
  
  intervals.forEach(i => {
    const ts = i.timestamp ? new Date(i.timestamp).toLocaleString() : '';
    csv += `${i.interval_num},${ts},${i.node},${(i.lmp || 0).toFixed(2)},${i.mode},${i.power_mw},${i.duration_min},${(i.energy_mwh || 0).toFixed(4)},${(i.cost_revenue || 0).toFixed(2)},${(i.running_total || 0).toFixed(2)},"${(i.notes || '').replace(/"/g, '""')}"\n`;
  });
  
  // Create and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cycle.name || 'cycle'}_${cycle.date || 'report'}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}