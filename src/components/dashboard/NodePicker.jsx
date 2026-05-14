import React, { useState, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, Search, X } from "lucide-react";
import { getFavorites, toggleFavorite, getRecent } from '@/lib/ercotStore';

export default function NodePicker({ nodes, value, onChange, disabled }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [favorites, setFavorites] = useState(getFavorites());
  const [open, setOpen] = useState(false);
  const recent = getRecent();

  const filtered = useMemo(() => {
    let list = nodes || [];
    if (filter === 'favorites') list = list.filter(n => favorites.includes(n.name));
    else if (filter === 'recent') list = list.filter(n => recent.includes(n.name));
    else if (filter !== 'all') list = list.filter(n => n.nodeType === filter);
    if (search) {
      const s = search.toUpperCase();
      list = list.filter(n => n.name.toUpperCase().includes(s));
    }
    return list.slice(0, 100);
  }, [nodes, search, filter, favorites]);

  const handleFav = (e, name) => {
    e.stopPropagation();
    setFavorites(toggleFavorite(name));
  };

  const handleSelect = (name) => {
    onChange(name);
    setOpen(false);
    setSearch('');
  };

  const selectedNode = nodes?.find(n => n.name === value);

  return (
    <div className="relative">
      <div 
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => !disabled && setOpen(!open)}
      >
        <div className={`flex-1 border rounded-lg px-3 py-2 text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'} ${value ? 'text-foreground' : 'text-muted-foreground'}`}>
          {value ? (
            <span className="font-mono font-medium">{value} {selectedNode ? `($${selectedNode.lmp?.toFixed(2)})` : ''}</span>
          ) : (
            'Select ERCOT Node...'
          )}
        </div>
        {value && !disabled && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); onChange(''); }}>
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-xl">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search nodes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
                autoFocus
              />
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {['all', 'favorites', 'recent', 'Hub', 'Load Zone', 'Resource Node'].map(f => (
                <Badge
                  key={f}
                  variant={filter === f ? 'default' : 'secondary'}
                  className="cursor-pointer text-xs capitalize"
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'All' : f === 'favorites' ? '★ Favorites' : f === 'recent' ? '⏱ Recent' : f}
                </Badge>
              ))}
            </div>
          </div>
          <ScrollArea className="h-56">
            <div className="p-1">
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No nodes found</p>
              )}
              {filtered.map(n => (
                <div
                  key={n.name}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm hover:bg-secondary ${n.name === value ? 'bg-primary/10' : ''}`}
                  onClick={() => handleSelect(n.name)}
                >
                  <button onClick={(e) => handleFav(e, n.name)} className="shrink-0">
                    <Star className={`w-3.5 h-3.5 ${favorites.includes(n.name) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
                  </button>
                  <span className="font-mono font-medium flex-1 truncate">{n.name}</span>
                  <span className={`font-mono text-xs ${n.lmp >= 0 ? 'text-accent' : 'text-destructive'}`}>${n.lmp?.toFixed(2)}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">{n.nodeType?.charAt(0)}</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}