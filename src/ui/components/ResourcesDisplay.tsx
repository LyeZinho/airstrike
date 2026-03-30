import React from 'react';
import { FactionState } from '../../types/geopolitics';
import { Zap, Flame, Heart, Gauge } from 'lucide-react';

interface ResourcesDisplayProps {
  faction: FactionState | undefined;
  factionName?: string;
}

export const ResourcesDisplay: React.FC<ResourcesDisplayProps> = ({ faction, factionName }) => {
  if (!faction) {
    return (
      <div className="flex-1 w-full h-full text-slate-500/50 flex flex-col justify-center items-center h-24">
        <span className="text-[10px] tracking-widest uppercase">No faction selected</span>
      </div>
    );
  }

  const getMoraleColor = (morale: number): string => {
    if (morale > 75) return 'text-green-400';
    if (morale > 50) return 'text-yellow-400';
    if (morale > 25) return 'text-orange-400';
    return 'text-red-400';
  };

  const getPostureColor = (posture: string): string => {
    switch (posture) {
      case 'DIPLOMATIC':
        return 'bg-blue-900 text-blue-300';
      case 'DEFENSIVE':
        return 'bg-yellow-900 text-yellow-300';
      case 'AGGRESSIVE':
        return 'bg-red-900 text-red-300';
      case 'WARTIME':
        return 'bg-red-950 text-red-400';
      default:
        return 'bg-gray-900 text-gray-300';
    }
  };

  return (
    <div className="flex-1 w-full h-full">
      <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2 mb-3">
        <Heart className="w-4 h-4 text-cyan-400" />
        <h3 className="text-[10px] text-cyan-400 font-bold tracking-widest">{factionName || faction.id}</h3>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-yellow-400" />
            <span className="text-gray-400">Credits</span>
          </div>
          <span className="font-mono text-yellow-400">{faction.credits.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-gray-400">Fuel</span>
          </div>
          <span className="font-mono text-orange-400">{faction.fuel.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            <span className="text-gray-400">Morale</span>
          </div>
          <span className={`font-mono ${getMoraleColor(faction.morale)}`}>{faction.morale}%</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-gray-400">Aircraft</span>
          </div>
          <span className="font-mono text-cyan-400">{faction.activeAircraft.length}</span>
        </div>

        <div className="pt-3 mt-1 border-t border-cyan-500/20 flex justify-between items-center">
          <span className="text-[9px] uppercase tracking-widest text-slate-400">Current Posture</span>
          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold tracking-widest uppercase ${getPostureColor(faction.posture)}`}>
            {faction.posture}
          </span>
        </div>
      </div>
    </div>
  );
};
