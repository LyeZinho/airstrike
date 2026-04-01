import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, TrendingUp, Shield, Globe, Target, Activity, Users, X } from 'lucide-react';
import { NewsEvent } from '../../utils/newsSystem';
import { useSimulationState } from '../../store/useSimulationState';
import { Side } from '../../types/entities';

interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  news?: NewsEvent[];
}

const getSeverityColor = (severity: string) => {
  if (severity === 'critical') return 'border-red-500 bg-red-500/10';
  if (severity === 'high') return 'border-orange-500 bg-orange-500/10';
  if (severity === 'medium') return 'border-yellow-500 bg-yellow-500/10';
  return 'border-slate-600 bg-slate-800/50';
};

const getTypeIcon = (type: string) => {
  if (type === 'threat') return <AlertTriangle size={14} className="text-red-400" />;
  if (type === 'military') return <Shield size={14} className="text-orange-400" />;
  if (type === 'political') return <Globe size={14} className="text-blue-400" />;
  return <Activity size={14} className="text-slate-400" />;
};

export const NewsModal: React.FC<NewsModalProps> = ({ isOpen, onClose, news = [] }) => {
  const aircrafts = useSimulationState((s) => s.gameState.aircrafts);

  const friendlyAircraft = aircrafts.filter((a) => a.side === Side.FRIENDLY);
  const allyAir = aircrafts.filter((a) => a.side === Side.ALLY);
  const activeMissions = friendlyAircraft.filter((a) => a.targetId);
  const idleAircraft = friendlyAircraft.filter((a) => !a.targetId);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[6000] pointer-events-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-slate-900 border border-amber-500/40 p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
                <TrendingUp size={24} />
                INTELLIGENCE BRIEFING
              </h2>
              <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex gap-2 mb-4 border-b border-slate-700 pb-2">
              <div className="flex-1 bg-slate-800 rounded p-2 text-center">
                <div className="text-lg font-bold text-emerald-400">{friendlyAircraft.length}</div>
                <div className="text-[10px] text-slate-400">Friendly Air</div>
              </div>
              <div className="flex-1 bg-slate-800 rounded p-2 text-center">
                <div className="text-lg font-bold text-blue-400">{allyAir.length}</div>
                <div className="text-[10px] text-slate-400">Allied Air</div>
              </div>
              <div className="flex-1 bg-slate-800 rounded p-2 text-center">
                <div className="text-lg font-bold text-amber-400">{activeMissions.length}</div>
                <div className="text-[10px] text-slate-400">On Mission</div>
              </div>
              <div className="flex-1 bg-slate-800 rounded p-2 text-center">
                <div className="text-lg font-bold text-slate-400">{idleAircraft.length}</div>
                <div className="text-[10px] text-slate-400">Ready</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {activeMissions.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={14} className="text-amber-400" />
                    <span className="text-sm font-bold text-amber-400 uppercase">Active Missions</span>
                  </div>
                  <div className="space-y-1">
                    {activeMissions.slice(0, 5).map((ac) => (
                      <div key={ac.id} className="flex justify-between items-center p-2 bg-slate-800/50 rounded text-xs">
                        <span className="text-slate-300">{ac.specId}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400">
                          ON MISSION
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {allyAir.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={14} className="text-blue-400" />
                    <span className="text-sm font-bold text-blue-400 uppercase">Allied Forces Activity</span>
                  </div>
                  <div className="space-y-1">
                    {allyAir.slice(0, 4).map((ac) => (
                      <div key={ac.id} className="flex justify-between items-center p-2 bg-blue-900/20 rounded text-xs">
                        <span className="text-slate-300">{ac.specId}</span>
                        <span className="text-blue-400 text-[10px]">DEPLOYED</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                <Shield size={14} className="text-amber-400" />
                <span className="text-sm font-bold text-amber-400 uppercase">Intelligence Reports</span>
              </div>
              {news.map((item, index) => (
                <motion.div
                  key={item.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-lg border ${getSeverityColor(item.severity)}`}
                >
                  <div className="flex items-start gap-2">
                    {getTypeIcon(item.type)}
                    <div>
                      <span className="text-sm text-slate-200 font-medium block">{item.title}</span>
                      <span className="text-xs text-slate-400">{item.description}</span>
                    </div>
                  </div>
                </motion.div>
              ))}

              {news.length === 0 && (
                <div className="text-slate-500 text-center py-8">No intelligence reports available.</div>
              )}
            </div>

            <button
              onClick={onClose}
              className="mt-4 w-full py-2 bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold rounded hover:bg-amber-500/30 transition-colors"
            >
              DISMISS
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
