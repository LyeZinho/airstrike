import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navigation, X, RotateCcw, Sword, Clock, Target } from 'lucide-react';
import { useSimulationState } from '../../store/useSimulationState';
import { Side, AircraftStatus, MissionType } from '../../types/entities';
import { simulationEngine } from '../../core/SimulationEngine';

interface MissionControlModalProps {
  isOpen: boolean;
  onClose: () => void;
}



export const MissionControlModal: React.FC<MissionControlModalProps> = ({ isOpen, onClose }) => {
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null);
  const [missionType, setMissionType] = useState<MissionType>(MissionType.PATROL);

  const gameState = useSimulationState((state) => state.gameState);

  if (!isOpen) return null;

  const availableAircrafts = gameState.aircrafts.filter(
    (a) => a.side === Side.FRIENDLY && a.status !== AircraftStatus.DESTROYED && a.status !== AircraftStatus.HANGAR
  );

  const handleAssign = () => {
    if (!selectedAircraftId) return;
    simulationEngine.setAircraftMission(selectedAircraftId, missionType);
    setSelectedAircraftId(null);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={handleBackdropClick}
          className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-slate-900 border border-blue-500/40 p-6 rounded-2xl w-[500px] shadow-2xl shadow-blue-500/20 text-blue-400 font-mono"
          >
            <div className="flex justify-between items-center mb-6 border-b border-blue-500/20 pb-4">
              <div className="flex items-center gap-3">
                <Navigation className="text-blue-400" />
                <h2 className="text-2xl font-black italic tracking-tighter uppercase">Mission Control Center</h2>
              </div>
              <button onClick={onClose} className="hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] opacity-60 uppercase font-bold">1. Select Asset</label>
                <select
                  value={selectedAircraftId || ''}
                  onChange={(e) => setSelectedAircraftId(e.target.value)}
                  className="w-full bg-slate-800 border border-blue-500/30 p-3 rounded text-sm outline-none focus:border-blue-500"
                >
                  <option value="">-- SELECT AIRCRAFT --</option>
                  {availableAircrafts.map((ac) => (
                    <option key={ac.id} value={ac.id}>
                      {ac.specId} ({ac.id.split('-')[0]})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] opacity-60 uppercase font-bold">2. Mission Profile</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: MissionType.PATROL, icon: RotateCcw, label: 'PATROL' },
                    { type: MissionType.STRIKE, icon: Sword, label: 'STRIKE' },
                    { type: MissionType.DEFENSE, icon: RotateCcw, label: 'DEFENSE' },
                    { type: MissionType.LOITER, icon: Clock, label: 'LOITER' },
                    { type: MissionType.INTERCEPT, icon: Target, label: 'INTERCEPT' },
                  ].map((m) => (
                    <button
                      key={m.type}
                      onClick={() => setMissionType(m.type)}
                      className={`flex flex-col items-center gap-1 p-2 border rounded transition-all ${
                        missionType === m.type
                          ? 'bg-blue-500/30 border-blue-500 text-blue-300'
                          : 'bg-slate-800/50 border-blue-500/10 hover:bg-blue-500/10'
                      }`}
                    >
                      <m.icon size={16} />
                      <span className="text-[9px] font-bold">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-500/5 p-3 rounded border border-blue-500/20">
                <div className="text-[8px] opacity-60 uppercase mb-1">Selected Mission</div>
                <div className="text-sm font-bold text-blue-300">{missionType}</div>
              </div>

              <button
                disabled={!selectedAircraftId}
                onClick={handleAssign}
                className="w-full py-4 bg-blue-600 text-white font-black text-lg uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Execute Mission
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
