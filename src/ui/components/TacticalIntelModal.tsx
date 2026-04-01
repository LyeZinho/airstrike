import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, X, Radio, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useSimulationState } from '../../store/useSimulationState';
import { useWarRoomStore } from '../../store/useWarRoomStore';
import { Side, AircraftStatus } from '../../types/entities';

interface TacticalIntelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TacticalIntelModal: React.FC<TacticalIntelModalProps> = ({ isOpen, onClose }) => {
  const gameState = useSimulationState((s) => s.gameState);
  const { newsArticles, objectives } = useWarRoomStore();

  if (!isOpen) return null;

  const friendly = gameState.aircrafts.filter(
    (a) => a.side === Side.FRIENDLY && a.status !== AircraftStatus.DESTROYED,
  );
  const hostile = gameState.aircrafts.filter(
    (a) => a.side === Side.HOSTILE && a.status !== AircraftStatus.DESTROYED,
  );
  const destroyed = gameState.aircrafts.filter((a) => a.status === AircraftStatus.DESTROYED);

  const latestNews = [...newsArticles].sort((a, b) => b.timestamp - a.timestamp).slice(0, 6);
  const activeObjectives = objectives.filter((o) => o.status === 'ACTIVE');

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={handleBackdropClick}
          className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-slate-900 border border-amber-500/40 p-6 rounded-2xl w-[560px] max-h-[80vh] overflow-y-auto shadow-2xl shadow-amber-500/10 text-amber-400 font-mono"
          >
            <div className="flex justify-between items-center mb-6 border-b border-amber-500/20 pb-4">
              <div className="flex items-center gap-3">
                <Eye className="text-amber-400" />
                <h2 className="text-xl font-black italic tracking-tighter uppercase">Tactical Intel</h2>
              </div>
              <button onClick={onClose} className="hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3 text-center">
                  <div className="text-[8px] opacity-60 uppercase mb-1">Friendly Active</div>
                  <div className="text-2xl font-black text-emerald-400">{friendly.length}</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-center">
                  <div className="text-[8px] opacity-60 uppercase mb-1">Hostile Detected</div>
                  <div className="text-2xl font-black text-red-400">{hostile.length}</div>
                </div>
                <div className="bg-slate-800 border border-white/10 rounded p-3 text-center">
                  <div className="text-[8px] opacity-60 uppercase mb-1">Destroyed</div>
                  <div className="text-2xl font-black text-slate-400">{destroyed.length}</div>
                </div>
              </div>

              {friendly.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[9px] opacity-50 uppercase font-bold tracking-widest mb-2 flex items-center gap-2">
                    <Radio size={10} /> Friendly Assets
                  </div>
                  {friendly.map((ac) => (
                    <div
                      key={ac.id}
                      className="flex justify-between items-center bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 rounded text-xs"
                    >
                      <span className="text-emerald-300 font-bold">{ac.specId}</span>
                      <span className="opacity-50">{ac.id.slice(0, 12)}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          ac.status === AircraftStatus.COMBAT
                            ? 'bg-red-500/30 text-red-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {ac.status}
                      </span>
                      <span className="text-[9px] opacity-40">{ac.mission?.type ?? 'NO MISSION'}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeObjectives.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[9px] opacity-50 uppercase font-bold tracking-widest mb-2 flex items-center gap-2">
                    <CheckCircle size={10} /> Active Objectives
                  </div>
                  {activeObjectives.map((obj) => (
                    <div
                      key={obj.id}
                      className="flex justify-between items-center bg-amber-500/5 border border-amber-500/10 px-3 py-1.5 rounded text-xs"
                    >
                      <span className="text-amber-300 font-bold">{obj.type}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${obj.progress}%` }}
                          />
                        </div>
                        <span className="text-[9px] opacity-50">{obj.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {latestNews.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[9px] opacity-50 uppercase font-bold tracking-widest mb-2 flex items-center gap-2">
                    <Clock size={10} /> Latest Intel Feed
                  </div>
                  {latestNews.map((article) => (
                    <div
                      key={article.id}
                      className="bg-slate-800/50 border border-white/5 px-3 py-2 rounded text-xs"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span
                          className={`text-[8px] font-bold px-1 rounded ${
                            article.category === 'MILITARY'
                              ? 'bg-red-500/20 text-red-400'
                              : article.category === 'ECONOMIC'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {article.category}
                        </span>
                        <span className="text-[8px] opacity-30">
                          {new Date(article.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="mt-1 text-amber-200/80 leading-tight">{article.headline}</p>
                    </div>
                  ))}
                </div>
              )}

              {hostile.length === 0 && friendly.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-8 opacity-40">
                  <AlertTriangle size={32} />
                  <span className="text-sm">NO ACTIVE CONTACTS</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
