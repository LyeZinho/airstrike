import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, DollarSign, MapPin, Plane, X } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';

interface IncidentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IncidentReportModal: React.FC<IncidentReportModalProps> = ({ isOpen, onClose }) => {
  const incidents = usePlayerStore((s) => s.crashHistory);
  const recent = incidents.slice(-10).reverse();
  const totalDamage = incidents.reduce((sum, r) => sum + r.financialDamage, 0);
  const survivors = recent.filter((r) => r.survivorsCount > 0).length;
  const survivalPct = recent.length > 0 ? ((survivors / recent.length) * 100).toFixed(0) : '0';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[5999] pointer-events-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-slate-900 border border-red-500/40 p-6 rounded-lg max-w-3xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black text-red-400 flex items-center gap-2">
                <AlertTriangle size={24} />
                INCIDENT REPORT
              </h2>
              <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4 border-b border-slate-700 pb-2">
              <div className="bg-slate-800 rounded p-2 text-center">
                <div className="text-lg font-bold text-red-400">{incidents.length}</div>
                <div className="text-[10px] text-slate-400">Total Losses</div>
              </div>
              <div className="bg-slate-800 rounded p-2 text-center">
                <div className="text-lg font-bold text-orange-400">{(totalDamage / 1000000).toFixed(1)}M</div>
                <div className="text-[10px] text-slate-400">Credits Lost</div>
              </div>
              <div className="bg-slate-800 rounded p-2 text-center">
                <div className="text-lg font-bold text-yellow-400">{survivalPct}%</div>
                <div className="text-[10px] text-slate-400">Pilot Survival</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
              {recent.length === 0 ? (
                <div className="text-slate-500 text-center py-8">No incident reports.</div>
              ) : (
                recent.map((incident, idx) => (
                  <motion.div
                    key={incident.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-3 rounded-lg border ${incident.lawsuitFiled ? 'border-red-500 bg-red-500/10' : 'border-slate-600 bg-slate-800/50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <Plane size={16} className="text-slate-400 flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-200 text-sm">{incident.aircraftType}</div>
                        <div className="text-xs text-slate-400 flex flex-wrap gap-2 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {incident.location.lat.toFixed(2)}, {incident.location.lng.toFixed(2)}
                          </span>
                          <span className="text-slate-400">{incident.causeOfCrash}</span>
                          <span className={incident.survivorsCount === 0 ? 'text-red-400' : 'text-yellow-400'}>
                            Survivors: {incident.survivorsCount}
                          </span>
                          {incident.lawsuitFiled && (
                            <span className="text-red-400 font-bold">⚖️ LAWSUIT FILED</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="flex items-center gap-1 text-red-400 font-bold">
                          <DollarSign size={14} />
                          <span className="text-sm">{(incident.financialDamage / 1000000).toFixed(1)}M</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {new Date(incident.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <button
              onClick={onClose}
              className="mt-4 w-full py-2 bg-red-500/20 border border-red-500/40 text-red-400 font-bold rounded hover:bg-red-500/30 transition-colors"
            >
              ACKNOWLEDGE
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
