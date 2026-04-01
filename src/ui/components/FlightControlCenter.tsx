import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Navigation, MapPin, RotateCcw, Crosshair, Radio, PauseCircle } from 'lucide-react';
import { useSimulationState } from '../../store/useSimulationState';
import { useGameUI } from '../../store/useGameUI';
import { simulationEngine } from '../../core/SimulationEngine';
import { Side, AircraftStatus } from '../../types/entities';

interface FlightControlCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

type Waypoint = { lat: number; lng: number; altitudeFt?: number; speedKmh?: number };

const STATUS_COLOR: Record<string, string> = {
  [AircraftStatus.CRUISE]:   'text-emerald-400 border-emerald-500/40',
  [AircraftStatus.COMBAT]:   'text-red-400 border-red-500/40',
  [AircraftStatus.RTB]:      'text-yellow-400 border-yellow-500/40',
  [AircraftStatus.TAKEOFF]:  'text-blue-400 border-blue-500/40',
  [AircraftStatus.LANDING]:  'text-blue-400 border-blue-500/40',
  [AircraftStatus.HANGAR]:   'text-slate-400 border-slate-500/40',
  [AircraftStatus.DAMAGED]:  'text-orange-400 border-orange-500/40',
  [AircraftStatus.DESTROYED]:'text-red-600 border-red-700/40',
};

function fuelBarColor(fuelPct: number): string {
  if (fuelPct > 0.5) return 'bg-emerald-500';
  if (fuelPct > 0.2) return 'bg-yellow-500';
  return 'bg-red-500';
}

function estimateFlightMinutes(
  waypoints: Waypoint[],
  startLat: number,
  startLng: number,
  defaultSpeedKmh: number
): number {
  const allPoints = [{ lat: startLat, lng: startLng, speedKmh: defaultSpeedKmh }, ...waypoints];
  let totalHours = 0;
  for (let i = 0; i < allPoints.length - 1; i++) {
    const a = allPoints[i];
    const b = allPoints[i + 1];
    // Distance in km: 1 degree lat/lng ≈ 111 km
    const distKm = Math.sqrt(((b.lat - a.lat) * 111) ** 2 + ((b.lng - a.lng) * 111) ** 2);
    const spd = b.speedKmh ?? defaultSpeedKmh;
    totalHours += distKm / (spd > 0 ? spd : defaultSpeedKmh);
  }
  return totalHours * 60;
}

export const FlightControlCenter: React.FC<FlightControlCenterProps> = ({ isOpen, onClose }) => {
  const { gameState } = useSimulationState();
  const { selectedAircraftId, selectAircraft, waypointMode, setWaypointMode, pendingMapWaypoint, setPendingMapWaypoint } = useGameUI();

  const [pendingWaypoints, setPendingWaypoints] = useState<Waypoint[]>([]);
  const [latInput, setLatInput] = useState('');

  useEffect(() => {
    if (pendingMapWaypoint) {
      setPendingWaypoints(prev => [...prev, { lat: pendingMapWaypoint.lat, lng: pendingMapWaypoint.lng }]);
      setPendingMapWaypoint(null);
    }
  }, [pendingMapWaypoint, setPendingMapWaypoint]);
  const [lngInput, setLngInput] = useState('');
  const [altInput, setAltInput] = useState('');
  const [speedInput, setSpeedInput] = useState('');
  const [directLat, setDirectLat] = useState('');
  const [directLng, setDirectLng] = useState('');

  useEffect(() => {
    if (!isOpen) setWaypointMode(false);
  }, [isOpen, setWaypointMode]);

  const aircraftList = (gameState?.aircrafts ?? []).filter(a => a.side === Side.FRIENDLY);
  const selectedAc = aircraftList.find(a => a.id === selectedAircraftId) ?? null;

  const handleAddWaypoint = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (isNaN(lat) || isNaN(lng)) return;
    const wp: Waypoint = { lat, lng };
    const alt = parseFloat(altInput);
    const spd = parseFloat(speedInput);
    if (!isNaN(alt)) wp.altitudeFt = alt;
    if (!isNaN(spd) && spd > 0) wp.speedKmh = spd;
    setPendingWaypoints(prev => [...prev, wp]);
    setLatInput('');
    setLngInput('');
    setAltInput('');
    setSpeedInput('');
  };

  const handleRemoveWaypoint = (idx: number) => {
    setPendingWaypoints(prev => prev.filter((_, i) => i !== idx));
  };

  const handleExecute = () => {
    if (!selectedAircraftId || pendingWaypoints.length === 0) return;
    simulationEngine.setFlightPlan(selectedAircraftId, pendingWaypoints);
    setPendingWaypoints([]);
  };

  const handleDirectTo = () => {
    if (!selectedAircraftId) return;
    const lat = parseFloat(directLat);
    const lng = parseFloat(directLng);
    if (isNaN(lat) || isNaN(lng)) return;
    simulationEngine.setFlightPlan(selectedAircraftId, [{ lat, lng }]);
    setDirectLat('');
    setDirectLng('');
  };

  const handleRTB = () => {
    if (!selectedAircraftId) return;
    simulationEngine.orderRTB(selectedAircraftId);
    setPendingWaypoints([]);
  };

  const handleHold = () => {
    if (!selectedAircraftId) return;
    simulationEngine.setFlightPlan(selectedAircraftId, []);
  };

  const handleTakeoff = () => {
    if (!selectedAircraftId) return;
    simulationEngine.orderTakeoff(selectedAircraftId);
  };

  const flightMinutes = selectedAc
    ? estimateFlightMinutes(pendingWaypoints, selectedAc.position.lat, selectedAc.position.lng, selectedAc.speed || 800)
    : 0;

  const inputClass = 'bg-slate-900 border border-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2 py-1 rounded w-full focus:outline-none focus:border-emerald-500/60 placeholder-slate-600';
  const btnClass = (color: string) => `px-3 py-1.5 text-[9px] font-black tracking-widest uppercase border rounded transition-all hover:brightness-110 active:scale-95 ${color}`;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="bg-[#020617] border border-emerald-500/40 rounded-xl shadow-2xl shadow-emerald-500/10 w-[820px] max-h-[88vh] flex flex-col overflow-hidden text-slate-300 font-mono"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-500/20 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <Radio className="text-emerald-400 w-5 h-5" />
                <h2 className="text-sm font-black tracking-[0.3em] uppercase text-emerald-400">FCC — FLIGHT CONTROL CENTER</h2>
                <span className="text-[8px] text-emerald-600 border border-emerald-600/30 px-2 py-0.5 rounded tracking-widest">ATC ACTIVE</span>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-red-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden">
              <div className="w-[280px] border-r border-emerald-500/10 flex flex-col">
                <div className="px-4 py-3 border-b border-emerald-500/10">
                  <span className="text-[8px] text-emerald-600 font-black tracking-[0.3em] uppercase">FRIENDLY UNITS</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {aircraftList.length === 0 && (
                    <div className="text-[10px] text-slate-600 text-center py-6">NO AIRCRAFT AIRBORNE</div>
                  )}
                  {aircraftList.map((ac) => {
                    const maxFuel = 10000;
                    const fuelPct = Math.min(1, ac.fuel / maxFuel);
                    const statusColor = STATUS_COLOR[ac.status] ?? 'text-slate-400 border-slate-500/40';
                    const isSelected = selectedAircraftId === ac.id;
                    return (
                      <button
                        key={ac.id}
                        onClick={() => { selectAircraft(ac.id); setPendingWaypoints([]); }}
                        className={`w-full text-left p-3 rounded border transition-all ${isSelected ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-900/40 border-white/5 hover:border-emerald-500/20'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-emerald-300 truncate">{ac.specId || ac.id.slice(0, 8)}</span>
                          <span className={`text-[7px] font-bold border px-1.5 py-0.5 rounded ${statusColor}`}>{ac.status}</span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 rounded overflow-hidden">
                          <div className={`h-full rounded transition-all ${fuelBarColor(fuelPct)}`} style={{ width: `${fuelPct * 100}%` }} />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[7px] text-slate-600">FUEL</span>
                          <span className="text-[7px] text-slate-500">{Math.round(fuelPct * 100)}%</span>
                        </div>
                        {ac.flightPlan && ac.flightPlan.length > 0 && (
                          <div className="mt-1 text-[7px] text-emerald-600">{ac.flightPlan.length} WP ACTIVE</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="px-5 py-3 border-b border-emerald-500/10 bg-slate-950/40 flex items-center justify-between">
                  <div>
                    <span className="text-[8px] text-slate-600 tracking-widest uppercase">SELECTED</span>
                    <div className="text-sm font-black text-emerald-400 tracking-widest mt-0.5">
                      {selectedAc ? selectedAc.specId || selectedAc.id.slice(0, 8) : '— SELECT AIRCRAFT —'}
                    </div>
                    {selectedAc && (
                      <div className="text-[9px] text-slate-500 mt-0.5">
                        POS {selectedAc.position.lat.toFixed(3)}°N {selectedAc.position.lng.toFixed(3)}°E &nbsp;·&nbsp; HDG {Math.round(selectedAc.heading)}° &nbsp;·&nbsp; {Math.round(selectedAc.speed)} km/h
                      </div>
                    )}
                  </div>
                  {flightMinutes > 0 && pendingWaypoints.length > 0 && (
                    <div className="text-right">
                      <div className="text-[8px] text-slate-600 tracking-widest uppercase">EST FLIGHT TIME</div>
                      <div className="text-sm font-black text-emerald-300">{flightMinutes.toFixed(1)} MIN</div>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  <div>
                    <div className="text-[8px] text-emerald-600 font-black tracking-[0.3em] uppercase mb-2 flex items-center gap-2">
                      <Navigation size={10} />
                      ROUTE PLAN ({pendingWaypoints.length} waypoints)
                    </div>
                    {pendingWaypoints.length === 0 ? (
                      <div className="text-[10px] text-slate-700 py-3 text-center border border-dashed border-slate-800 rounded">NO WAYPOINTS — ADD BELOW</div>
                    ) : (
                      <div className="space-y-1">
                        {pendingWaypoints.map((wp, i) => (
                          <div key={i} className="flex items-center gap-2 bg-slate-900/50 border border-emerald-500/10 rounded px-3 py-1.5">
                            <span className="text-[8px] text-emerald-600 w-4 text-right shrink-0">{i + 1}</span>
                            <span className="text-[9px] text-emerald-300 flex-1">
                              {wp.lat.toFixed(4)}°N &nbsp; {wp.lng.toFixed(4)}°E
                              {wp.altitudeFt != null && <span className="text-slate-500"> &nbsp;{wp.altitudeFt}ft</span>}
                              {wp.speedKmh != null && <span className="text-slate-500"> &nbsp;{wp.speedKmh}km/h</span>}
                            </span>
                            <button onClick={() => handleRemoveWaypoint(i)} className="text-slate-600 hover:text-red-400 transition-colors shrink-0">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border border-emerald-500/10 rounded p-4 space-y-3">
                    <div className="text-[8px] text-emerald-600 font-black tracking-[0.3em] uppercase flex items-center gap-2">
                      <MapPin size={10} />
                      ADD WAYPOINT
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[7px] text-slate-600 mb-1 uppercase">Latitude</div>
                        <input className={inputClass} placeholder="e.g. 44.500" value={latInput} onChange={e => setLatInput(e.target.value)} />
                      </div>
                      <div>
                        <div className="text-[7px] text-slate-600 mb-1 uppercase">Longitude</div>
                        <input className={inputClass} placeholder="e.g. 34.200" value={lngInput} onChange={e => setLngInput(e.target.value)} />
                      </div>
                      <div>
                        <div className="text-[7px] text-slate-600 mb-1 uppercase">Altitude (ft) — optional</div>
                        <input className={inputClass} placeholder="e.g. 25000" value={altInput} onChange={e => setAltInput(e.target.value)} />
                      </div>
                      <div>
                        <div className="text-[7px] text-slate-600 mb-1 uppercase">Speed (km/h) — optional</div>
                        <input className={inputClass} placeholder="e.g. 900" value={speedInput} onChange={e => setSpeedInput(e.target.value)} />
                      </div>
                    </div>
                    <button
                      onClick={handleAddWaypoint}
                      disabled={!latInput || !lngInput}
                      className="w-full py-1.5 text-[9px] font-black tracking-widest uppercase border border-emerald-500/30 text-emerald-400 rounded hover:bg-emerald-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      + ADD TO ROUTE
                    </button>
                  </div>

                  <div className="border border-blue-500/10 rounded p-4 space-y-3">
                    <div className="text-[8px] text-blue-400 font-black tracking-[0.3em] uppercase flex items-center gap-2">
                      <Crosshair size={10} />
                      DIRECT-TO
                    </div>
                    <div className="flex gap-2">
                      <input className={inputClass} placeholder="Lat" value={directLat} onChange={e => setDirectLat(e.target.value)} />
                      <input className={inputClass} placeholder="Lng" value={directLng} onChange={e => setDirectLng(e.target.value)} />
                      <button
                        onClick={handleDirectTo}
                        disabled={!selectedAircraftId || !directLat || !directLng}
                        className="shrink-0 px-3 py-1 text-[9px] font-black tracking-widest uppercase border border-blue-500/30 text-blue-400 rounded hover:bg-blue-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        DIRECT
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-emerald-500/10 pt-4 space-y-3">
                    <div className="text-[8px] text-emerald-600 font-black tracking-[0.3em] uppercase">CLEARANCES</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleExecute}
                        disabled={!selectedAircraftId || pendingWaypoints.length === 0}
                        className={btnClass('bg-emerald-500/20 border-emerald-500/50 text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed')}
                      >
                        ▶ EXECUTE
                      </button>
                      <button
                        onClick={handleTakeoff}
                        disabled={!selectedAircraftId}
                        className={btnClass('bg-blue-500/20 border-blue-500/50 text-blue-300 disabled:opacity-30 disabled:cursor-not-allowed')}
                      >
                        ↑ TAKEOFF
                      </button>
                      <button
                        onClick={handleRTB}
                        disabled={!selectedAircraftId}
                        className={btnClass('bg-yellow-500/20 border-yellow-500/50 text-yellow-300 disabled:opacity-30 disabled:cursor-not-allowed')}
                      >
                        <RotateCcw size={10} className="inline mr-1" />
                        RTB
                      </button>
                      <button
                        onClick={handleHold}
                        disabled={!selectedAircraftId}
                        className={btnClass('bg-orange-500/20 border-orange-500/50 text-orange-300 disabled:opacity-30 disabled:cursor-not-allowed')}
                      >
                        <PauseCircle size={10} className="inline mr-1" />
                        HOLD
                      </button>
                      <button
                        onClick={() => setWaypointMode(!waypointMode)}
                        className={btnClass(waypointMode ? 'bg-purple-500/30 border-purple-400 text-purple-200 shadow-[0_0_8px_rgba(168,85,247,0.3)]' : 'bg-slate-900/60 border-slate-600/40 text-slate-400')}
                      >
                        <MapPin size={10} className="inline mr-1" />
                        {waypointMode ? 'WP MODE ON' : 'WP MODE'}
                      </button>
                    </div>
                    {waypointMode && (
                      <div className="text-[9px] text-purple-400 border border-purple-500/20 bg-purple-500/5 rounded px-3 py-2">
                        WAYPOINT MODE ACTIVE — click the map to add coordinates
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
