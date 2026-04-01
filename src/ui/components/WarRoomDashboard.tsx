import React, { useMemo, useState } from 'react';
import { useWarRoomStore } from '../../store/useWarRoomStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useSimulationState } from '../../store/useSimulationState';
import { GlobalMonitor } from './GlobalMonitor';
import { DiplomacyMatrix } from './DiplomacyMatrix';
import { ObjectivesTracker } from './ObjectivesTracker';
import { ResourcesDisplay } from './ResourcesDisplay';
import { TacticalMap } from './TacticalMap';
import { ScrambleModal } from './ScrambleModal';
import { MissionControlModal } from './MissionControlModal';
import { WelcomeTerminal } from './WelcomeTerminal';
import { NewsModal } from './NewsModal';
import { LegalDesk } from './LegalDesk';
import { IncidentReportModal } from './IncidentReportModal';
import { DetailedMarketView } from './DetailedMarketView';
import { BuildMenu } from './BuildMenu';
import { TacticalIntelModal } from './TacticalIntelModal';
import { FlightControlCenter } from './FlightControlCenter';
import { Radar, Menu, Globe, Shield, Activity, Target, Cpu, Clock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameEngine } from '../hooks/useGameEngine';
import { Side } from '../../types/entities';
import { StockMarket } from '../../types/geopolitics';

const EMPTY_STOCK_MARKET: StockMarket = {
  activeFactions: [],
  currentPrices: {},
  priceHistory: {},
  lastUpdateTick: 0,
};

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
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('airstrike_welcomed'));

  const { credits, fuel, missileStock } = usePlayerStore((s) => s.base);
  const { gameState } = useSimulationState();
  const friendlyAircrafts = (gameState?.aircrafts ?? []).filter(a => a.side === Side.FRIENDLY);

  // Initialize and start the Simulation Engine
  const { isPaused, togglePause } = useGameEngine();

  // Factions for selector
  const factionNamesMap = useMemo(() => {
    const map = new Map<string, { name: string }>();
    factions.forEach((faction) => {
      map.set(faction.id, { name: faction.id });
    });
    return map;
  }, [factions]);

  // Selected Faction UI state
  const selectedFaction = useMemo(() => {
    if (!selectedFactionId) return undefined;
    return factions.get(selectedFactionId);
  }, [selectedFactionId, factions]);

  const activeFactionObjectives = useMemo(() => {
    if (!selectedFactionId) return [];
    return objectives.filter((obj) => obj.factionId === selectedFactionId);
  }, [selectedFactionId, objectives]);

  return (
    <div className="relative w-full h-full bg-[#020617] text-slate-300 font-sans text-xs tracking-wide overflow-hidden select-none">
      
      {/* HUD Bar: Resources + Action Buttons */}
      <div className="absolute top-16 left-0 right-0 h-10 glass-panel z-50 flex items-center justify-between px-4 border-b border-emerald-500/10">
        {/* Resource Strip */}
        <div className="flex items-center gap-5 font-mono text-xs">
          <span className="text-emerald-400">💰 {credits.toLocaleString()}</span>
          <span className="text-blue-400">⛽ {(fuel / 1000).toFixed(0)}kL</span>
          <span className="text-red-400">🚀 ×{missileStock}</span>
        </div>
        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {(['SCRAMBLE', 'MISSION CTRL', 'INTEL', 'NEWS', 'MARKETS', 'LEGAL', 'INCIDENTS', 'BUILD', 'FCC'] as const).map((label) => {
            const key = label.toLowerCase().replace(' ', '_');
            return (
              <button
                key={key}
                className={`hud-btn${activeModal === key ? ' active' : ''}`}
                onClick={() => setActiveModal(activeModal === key ? null : key)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <TacticalIntelModal isOpen={activeModal === 'intel'} onClose={() => setActiveModal(null)} />
      <ScrambleModal isOpen={activeModal === 'scramble'} onClose={() => setActiveModal(null)} />
      <MissionControlModal isOpen={activeModal === 'mission_ctrl'} onClose={() => setActiveModal(null)} />
      <NewsModal isOpen={activeModal === 'news'} onClose={() => setActiveModal(null)} />
      <LegalDesk isOpen={activeModal === 'legal'} onClose={() => setActiveModal(null)} />
      <IncidentReportModal isOpen={activeModal === 'incidents'} onClose={() => setActiveModal(null)} />
      {activeModal === 'markets' && (
        <DetailedMarketView stockMarket={EMPTY_STOCK_MARKET} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'build' && (
        <BuildMenu onClose={() => setActiveModal(null)} />
      )}
      <FlightControlCenter isOpen={activeModal === 'fcc'} onClose={() => setActiveModal(null)} />

      {/* Welcome Terminal — shown on first load */}
      {showWelcome && (
        <WelcomeTerminal isOpen={showWelcome} onClose={() => { setShowWelcome(false); localStorage.setItem('airstrike_welcomed', '1'); }} />
      )}

      {/* Background Tactical Map */}
      <div className="absolute inset-0 z-0">
        <TacticalMap />
      </div>

      {/* Header: Command Hub */}
      <div className="absolute top-0 left-0 right-0 h-16 glass-panel z-50 flex items-center justify-between px-6 border-b border-emerald-500/20">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setLeftOpen(!leftOpen)} 
            className="text-emerald-500 p-2 rounded bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors"
          >
             <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-4">
            <Radar className="w-8 h-8 text-emerald-500 radar-sweep-anim glow-text-emerald" />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-widest text-emerald-500 leading-none">STRATOSFEAR</h1>
              <span className="text-[8px] text-emerald-600 font-bold tracking-[0.4em] mt-1 pl-1">OS-INTEL TERMINAL ALPHA</span>
            </div>
          </div>
        </div>

        {/* Global Telemetry */}
        <div className="hidden lg:flex items-center gap-10 bg-slate-950/60 px-8 py-3 rounded border border-white/5">
           <div className="flex flex-col items-center">
              <span className="text-[7px] text-slate-500 font-black tracking-widest uppercase mb-1">MISSION_TIME</span>
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-emerald-600" />
                <span className="text-xs font-bold text-white tabular-nums">{(gameTime / 100).toFixed(0)}</span>
              </div>
           </div>
           <div className="w-px h-6 bg-white/5"></div>
           <div className="flex flex-col items-center">
              <span className="text-[7px] text-slate-500 font-black tracking-widest uppercase mb-1">SYSTEM_STATUS</span>
              <div className="flex items-center gap-2">
                <Cpu size={12} className="text-emerald-500" />
                <span className="text-xs font-bold text-emerald-400">READY</span>
              </div>
           </div>
           <div className="w-px h-6 bg-white/5"></div>
           <div className="flex flex-col items-center">
              <span className="text-[7px] text-slate-500 font-black tracking-widest uppercase mb-1">OPS_MODE</span>
              <div className="flex items-center gap-2">
                <AlertTriangle size={12} className={paused ? 'text-red-500 animate-pulse' : 'text-emerald-500'} />
                <span className={`text-xs font-bold ${paused ? 'text-red-500' : 'text-emerald-300'}`}>
                  {paused ? 'PAUSED' : 'COMBAT_READY'}
                </span>
              </div>
           </div>
        </div>

        <button 
          onClick={() => setRightOpen(!rightOpen)} 
          className="text-emerald-500 p-2 rounded bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors"
        >
          <Activity size={20} />
        </button>
      </div>

      <AnimatePresence>
        {/* Left Side: Strategic Hub */}
        {leftOpen && (
          <motion.div 
            key="left-panel"
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            className="absolute left-4 top-[6.5rem] bottom-4 w-80 glass-panel z-40 rounded flex flex-col p-5 gap-6"
          >
             {/* Faction Command */}
             <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-500/80 mb-2">
                  <Shield className="w-4 h-4" />
                  <h3 className="font-bold text-[9px] tracking-[0.2em] uppercase">FACTION_CORE</h3>
                </div>
                <div className="flex flex-col gap-2">
                   {Array.from(factions.keys()).map((id, idx) => (
                      <button
                        key={id || `faction-${idx}`}
                        onClick={() => setSelectedFaction(id)}
                        className={`w-full text-left px-4 py-2 text-[9px] font-bold tracking-widest border transition-all rounded ${
                          selectedFactionId === id
                            ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                            : 'bg-slate-900/60 border-white/5 text-slate-500 hover:border-emerald-500/30 hover:text-emerald-400'
                        }`}
                      >
                        {id.replace('_', ' ')}
                      </button>
                   ))}
                </div>
             </div>

             {/* Resources Matrix */}
             <div className="bg-slate-950/60 border border-white/5 p-4 rounded shadow-inner">
                 <ResourcesDisplay faction={selectedFaction} factionName={selectedFactionId || undefined} />
             </div>

             {/* Mission Ops Tracker */}
             <div className="flex-1 flex flex-col min-h-0 bg-slate-950/40 border border-white/5 rounded p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                   <div className="flex items-center gap-2 text-emerald-500">
                     <Target className="w-4 h-4" />
                     <h3 className="font-bold text-[9px] tracking-[0.2em] uppercase">MISSION_PROTOCOL</h3>
                   </div>
                   <span className="text-[9px] text-emerald-600/60">{activeFactionObjectives.length} ACTV</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   <ObjectivesTracker objectives={activeFactionObjectives} />
                </div>
             </div>

             <div className="mt-2 space-y-1">
               <div className="text-[9px] text-emerald-500/80 font-bold tracking-widest uppercase mb-2">AIRCRAFT CTRL</div>
               {friendlyAircrafts.map((ac) => (
                 <div key={ac.id} className="bg-slate-950/60 border border-white/5 rounded p-2">
                   <div className="text-[9px] font-bold text-emerald-400 truncate mb-1">{ac.specId || ac.id.slice(0,8)}</div>
                   <div className="flex gap-1">
                     <button 
                       className="text-[8px] px-2 py-0.5 border border-emerald-700/50 text-emerald-400 hover:bg-emerald-700/20 font-mono"
                       onClick={() => { usePlayerStore.getState().addFuel(1000); usePlayerStore.getState().addMissionLog(`${ac.specId} landed`); }}
                     >LAND</button>
                     <button 
                       className="text-[8px] px-2 py-0.5 border border-yellow-700/50 text-yellow-400 hover:bg-yellow-700/20 font-mono"
                       onClick={() => console.log('ECM toggle', ac.id)}
                     >ECM</button>
                     <button 
                       className="text-[8px] px-2 py-0.5 border border-red-700/50 text-red-400 hover:bg-red-700/20 font-mono"
                       onClick={() => usePlayerStore.getState().spendMissile()}
                     >FIRE</button>
                   </div>
                 </div>
               ))}
             </div>
          </motion.div>
        )}

        {/* Right Side: Intelligence & Intel */}
        {rightOpen && (
          <motion.div 
            key="right-panel"
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="absolute right-4 top-[6.5rem] bottom-4 w-96 glass-panel z-40 rounded flex flex-col p-5 gap-6"
          >
             {/* Global Intel Stream */}
             <div className="flex-1 flex flex-col min-h-0 bg-slate-950/60 border border-white/5 rounded p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                   <div className="flex items-center gap-2 text-emerald-500">
                     <Globe className="w-4 h-4" />
                     <h3 className="font-bold text-[9px] tracking-[0.2em] uppercase">INTEL_STREAM</h3>
                   </div>
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   <GlobalMonitor articles={newsArticles} />
                </div>
             </div>

             {/* Geopolitical Relationship Matrix */}
             <div className="flex-1 flex flex-col min-h-0 bg-slate-950/60 border border-white/5 rounded p-4 overflow-hidden">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10 text-emerald-500">
                   <Activity className="w-4 h-4" />
                   <h3 className="font-bold text-[9px] tracking-[0.2em] uppercase">DYNAMIC_DIPLOMACY</h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   <DiplomacyMatrix relationships={relationships} factions={factionNamesMap} />
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative Border Overlay */}
      <div className="absolute inset-0 border border-emerald-500/5 pointer-events-none z-10 pointer-events-none"></div>
    </div>
  );
};
