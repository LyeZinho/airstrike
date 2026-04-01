import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { simulationEngine } from '../../core/SimulationEngine';

interface ScrambleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScrambleModal: React.FC<ScrambleModalProps> = ({ isOpen, onClose }) => {
  const [selectedModel, setSelectedModel] = useState<string>('F-16C');
  const [fuelLoad, setFuelLoad] = useState(100);

  const aircraftTypes = ['F-16C', 'MiG-29', 'Gripen', 'Rafale'];

  const credits = usePlayerStore((s) => s.base.credits);
  const fuel = usePlayerStore((s) => s.base.fuel);
  const missileStock = usePlayerStore((s) => s.base.missileStock);

  useEffect(() => {
    if (isOpen) {
      setFuelLoad(100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLaunch = () => {
    const fuelFraction = fuelLoad / 100;
    simulationEngine.launchAircraft(selectedModel, fuelFraction);
    usePlayerStore.getState().spendMissile();
    usePlayerStore.getState().spendFuel(Math.round(fuelFraction * 5000));
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
          className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-slate-900 border border-emerald-500/40 p-6 rounded-xl w-[420px] shadow-2xl shadow-emerald-500/20 text-emerald-500 font-mono"
          >
            <div className="flex justify-between items-center mb-6 border-b border-emerald-500/20 pb-4">
              <div className="flex items-center gap-3">
                <Settings className="text-emerald-400" />
                <h2 className="text-xl font-black italic tracking-tighter uppercase">Pre-Flight Config</h2>
              </div>
              <button onClick={onClose} className="hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] opacity-60 uppercase font-bold">Select Aircraft Type</label>
                <div className="max-h-40 overflow-y-auto bg-slate-800 border border-emerald-500/30 rounded">
                  {aircraftTypes.map((acType) => (
                    <button
                      key={acType}
                      onClick={() => setSelectedModel(acType)}
                      className={`w-full p-2 text-left text-sm transition-colors flex justify-between items-center ${
                        selectedModel === acType
                          ? 'bg-emerald-500/30 text-emerald-400'
                          : 'text-emerald-400/70 hover:bg-emerald-500/10'
                      }`}
                    >
                      <span>{acType}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center bg-emerald-500/5 p-3 rounded border border-emerald-500/10">
                <span className="text-sm opacity-60 uppercase">Airframe</span>
                <span className="text-lg font-bold text-emerald-400">{selectedModel}</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs uppercase font-bold">
                  <span>Fuel Loadout</span>
                  <span className={fuelLoad < 50 ? 'text-yellow-500' : 'text-emerald-400'}>{fuelLoad}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="10"
                  value={fuelLoad}
                  onChange={(e) => setFuelLoad(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] opacity-40">
                  <span>Short Range</span>
                  <span>Full Capacity</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-emerald-500/20">
                <div className="text-center">
                  <div className="text-[8px] opacity-40 uppercase mb-1">Credits</div>
                  <div className="text-xs font-bold">{credits.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-[8px] opacity-40 uppercase mb-1">Fuel Stock</div>
                  <div className="text-xs font-bold">{fuel.toLocaleString()}L</div>
                </div>
                <div className="text-center">
                  <div className="text-[8px] opacity-40 uppercase mb-1">Missiles</div>
                  <div className="text-xs font-bold">{missileStock}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-center">
                  <div className="text-[10px] opacity-40 uppercase mb-1">Takeoff Weight</div>
                  <div className="text-sm font-bold">NORMAL</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] opacity-40 uppercase mb-1">Mission Range</div>
                  <div className="text-sm font-bold">{Math.round((fuelLoad / 100) * 800)} KM</div>
                </div>
              </div>

              <button
                onClick={handleLaunch}
                className="w-full py-4 bg-emerald-500 text-slate-900 font-black text-lg uppercase tracking-widest hover:bg-emerald-400 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                Scramble Now
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
