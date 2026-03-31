import React from 'react';
import { FactionState } from '../../types/geopolitics';
import { zap, Flame, Heart, Gauge, Shield, CreditCard, Droplets, Target, Activity } from 'lucide-react';
import { motion } from 'motion/react';

interface ResourcesDisplayProps {
  faction: FactionState | undefined;
  factionName?: string;
}

export const ResourcesDisplay: React.FC<ResourcesDisplayProps> = ({ faction, factionName }) => {
  if (!faction) {
    return (
      <div className="flex-1 w-full flex flex-col justify-center items-center h-48 border border-dashed border-emerald-500/20 rounded bg-slate-950/40">
        <Activity className="w-8 h-8 mb-4 animate-pulse text-emerald-500/20" />
        <span className="text-[8px] tracking-[0.3em] uppercase text-emerald-500/30 font-bold">Select Faction</span>
      </div>
    );
  }

  const resourceItems = [
    { label: 'Credits', value: faction.credits.toLocaleString(), icon: CreditCard, color: 'text-emerald-400' },
    { label: 'Fuel_Res', value: faction.fuel.toLocaleString() + ' L', icon: Droplets, color: 'text-amber-400' },
    { label: 'Morale', value: faction.morale + '%', icon: Heart, color: faction.morale > 50 ? 'text-emerald-400' : 'text-red-400' },
    { label: 'Assets', value: faction.activeAircraft.length, icon: Shield, color: 'text-white' },
  ];

  return (
    <div className="flex-1 w-full">
      {/* Faction Header */}
      <div className="flex items-center gap-3 mb-5 border-b border-white/5 pb-3">
        <div className="p-1.5 bg-emerald-500/10 rounded border border-emerald-500/30">
           <Activity className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="flex flex-col">
          <h3 className="text-[10px] text-white font-black tracking-widest uppercase truncate max-w-[160px]">
            {factionName || faction.id}
          </h3>
          <span className="text-[7px] text-emerald-600/60 font-bold tracking-[0.2em] uppercase">SYSTEM_STATE: NOMINAL</span>
        </div>
      </div>

      {/* Resource Grid */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        {resourceItems.map((item, idx) => (
          <motion.div 
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex flex-col bg-slate-900 border border-white/5 p-3 rounded hover:border-emerald-500/20 transition-all"
          >
            <div className="flex items-center gap-2 mb-1.5 text-slate-500">
              <item.icon size={10} />
              <span className="text-[7px] font-black tracking-widest uppercase">{item.label}</span>
            </div>
            <span className={`text-base font-bold ${item.color} tabular-nums leading-none`}>
              {item.value}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Strategic Posture */}
      <div className="bg-slate-900 border border-white/5 p-3 rounded flex justify-between items-center group relative overflow-hidden">
         <div className="absolute top-0 left-0 w-0.5 h-full bg-emerald-500 group-hover:w-1 transition-all"></div>
         <div className="flex flex-col gap-0.5 pl-2">
            <span className="text-[7px] font-black tracking-widest text-slate-500 uppercase">CURRENT_POSTURE</span>
            <span className="text-[9px] font-bold text-white tracking-widest">STRATEGIC_CMD</span>
         </div>
         <span className={`px-2 py-0.5 rounded-sm border text-[8px] font-black tracking-widest uppercase ${
           faction.posture === 'AGGRESSIVE' || faction.posture === 'WARTIME' 
            ? 'bg-red-500/10 text-red-500 border-red-500/20' 
            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
         }`}>
            {faction.posture}
         </span>
      </div>
    </div>
  );
};
