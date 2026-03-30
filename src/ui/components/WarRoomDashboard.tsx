import React, { useMemo, useState } from 'react';
import { useWarRoomStore } from '../../store/useWarRoomStore';
import { GlobalMonitor } from './GlobalMonitor';
import { DiplomacyMatrix } from './DiplomacyMatrix';
import { ObjectivesTracker } from './ObjectivesTracker';
import { ResourcesDisplay } from './ResourcesDisplay';
import { TacticalMap } from './TacticalMap';
import { Radar, Menu, Globe, Shield, Activity, Target } from 'lucide-react';

export const WarRoomDashboard: React.FC = () => {
  const {
    factions,
    relationships,
    objectives,
    newsArticles,
    selectedFactionId,
    setSelectedFaction,
    gameTime,
    paused,
  } = useWarRoomStore();

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const selectedFaction = useMemo(() => {
    if (!selectedFactionId) return undefined;
    return factions.get(selectedFactionId);
  }, [selectedFactionId, factions]);

  const factionNamesMap = useMemo(() => {
    const map = new Map<string, { name: string }>();
    factions.forEach((faction) => {
      map.set(faction.id, { name: faction.id });
    });
    return map;
  }, [factions]);

  const activeFactionObjectives = useMemo(() => {
    if (!selectedFactionId) return [];
    return objectives.filter((obj) => obj.factionId === selectedFactionId);
  }, [selectedFactionId, objectives]);

  return (
    <div className="relative w-full h-full bg-slate-950 text-cyan-500 font-mono text-xs uppercase tracking-wider overflow-hidden">
      
      {/* Background Layer: Tactical Map */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-70">
        <TacticalMap />
      </div>

      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-slate-900/80 backdrop-blur-md border-b border-cyan-500/40 z-50 flex items-center justify-between px-4 sm:px-6 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
        <div className="flex items-center gap-4">
          <button onClick={() => setLeftOpen(!leftOpen)} className="hover:text-cyan-300 transition-colors">
             <Menu size={24} />
          </button>
          <div className="flex items-center gap-3">
            <Radar className="w-6 h-6 text-cyan-400 radar-sweep-anim aspect-square" />
            <h1 className="text-xl font-black text-cyan-400 tracking-widest hidden sm:block italic">STRATOSFEAR COMMAND</h1>
          </div>
        </div>
        <div className="flex items-center gap-6 sm:gap-8 text-[10px] font-bold tracking-widest">
           <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-cyan-600/60 leading-none mb-1">SYSTEM TIME</span>
              <span className="text-cyan-300">{(gameTime / 1000).toFixed(1)}S</span>
           </div>
           <div className="flex flex-col items-end">
              <span className="text-cyan-600/60 leading-none mb-1">STATUS</span>
              <span className={paused ? 'text-red-500 animate-pulse' : 'text-emerald-500'}>
                {paused ? 'DEFCON 1 (PAUSED)' : 'DEFCON 5 (ACTIVE)'}
              </span>
           </div>
           <button onClick={() => setRightOpen(!rightOpen)} className="hover:text-cyan-300 transition-colors ml-2 sm:ml-4">
             <Activity size={24} />
           </button>
        </div>
      </div>

      {/* Left HUD Panel */}
      <div className={`absolute left-0 top-14 bottom-0 w-80 bg-slate-900/85 backdrop-blur-md border-r border-cyan-500/30 z-40 transition-transform duration-300 transform ${leftOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.5)]`}>
         <div className="p-4 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">
            
            {/* Faction Select */}
            <div className="space-y-3 shrink-0">
              <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2 text-cyan-400">
                 <Shield className="w-4 h-4" />
                 <h3 className="font-bold tracking-widest">FACTION SELECT</h3>
              </div>
              <div className="space-y-1">
                {Array.from(factions.keys()).map((factionId) => (
                  <button
                    key={factionId}
                    onClick={() => setSelectedFaction(factionId)}
                    className={`w-full text-left px-3 py-2 text-[10px] tracking-wider transition-all border ${
                      selectedFactionId === factionId
                        ? 'bg-cyan-900/60 border-cyan-400 text-cyan-100 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-800/40 border-cyan-900/50 text-cyan-500/70 hover:bg-cyan-900/30 hover:border-cyan-500/50'
                    }`}
                  >
                    {factionId}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Resources */}
            <div className="border border-cyan-500/20 bg-slate-950/60 p-3 rounded shrink-0">
                <ResourcesDisplay faction={selectedFaction} factionName={selectedFactionId || undefined} />
            </div>

            {/* Objectives */}
            <div className="border border-cyan-500/20 bg-slate-950/60 p-3 rounded flex-1 flex flex-col min-h-0">
               <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2 mb-2 shrink-0 text-cyan-400">
                 <Target className="w-4 h-4" />
                 <h3 className="font-bold tracking-widest">OBJECTIVES</h3>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar">
                 <ObjectivesTracker objectives={activeFactionObjectives} onObjectiveClick={(obj) => console.log(obj)} />
               </div>
            </div>
            
         </div>
      </div>

      {/* Right HUD Panel */}
      <div className={`absolute right-0 top-14 bottom-0 w-80 sm:w-96 bg-slate-900/85 backdrop-blur-md border-l border-cyan-500/30 z-40 transition-transform duration-300 transform ${rightOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)]`}>
         <div className="p-4 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">
            
            {/* Intel Monitor */}
            <div className="border border-cyan-500/20 bg-slate-950/60 p-3 rounded flex-1 flex flex-col min-h-[50%]">
               <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2 mb-2 shrink-0 text-cyan-400">
                 <Globe className="w-4 h-4" />
                 <h3 className="font-bold tracking-widest">GLOBAL INTEL</h3>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                 <GlobalMonitor articles={newsArticles} onArticleClick={(a) => console.log(a)} />
               </div>
            </div>

            {/* Diplomacy Matrix */}
            <div className="border border-cyan-500/20 bg-slate-950/60 p-3 rounded flex-1 flex flex-col min-h-[40%]">
               <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2 mb-2 shrink-0 text-cyan-400">
                 <Activity className="w-4 h-4" />
                 <h3 className="font-bold tracking-widest">DIPLOMATIC MATRIX</h3>
               </div>
               <div className="flex-1 overflow-auto custom-scrollbar pr-1">
                  <DiplomacyMatrix relationships={relationships} factions={factionNamesMap} />
               </div>
            </div>

         </div>
      </div>

    </div>
  );
};
