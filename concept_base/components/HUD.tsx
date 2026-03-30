import { useGameStore } from "../store/useGameStore";
import { AIRCRAFT_SPECS } from "../constants/specs";
import { Side, AircraftStatus, FormationType, MissionType, MissileType, IFFStatus, RWRStatus, BuildingType } from "../types/game";
import { NewsEvent } from "../utils/newsSystem";
import { cn } from "../lib/utils";
import {
  Shield,
  Plane,
  Fuel,
  Target,
  Activity,
  Terminal,
  ChevronRight,
  AlertTriangle,
  ChevronLeft,
  Menu,
  Navigation,
  RotateCcw,
  Clock,
  Crosshair,
  Zap,
  Wind,
  X,
  Settings,
  Brain,
  Truck,
  Sword,
  ShieldAlert,
  MapPin,
  Newspaper,
  Antenna,
  Radio,
  Hammer,
  Construction,
  TrendingUp,
  TrendingDown,
  Scale
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { getDistanceKm, calculateFuelNeeded } from "../utils/physics";
import { analyzeThreatsAlgorithmic, TacticalAssessment } from "../utils/tacticalAnalysis";
import { NewsModal } from "./NewsModal";
import { IncidentReportModal } from "./IncidentReportModal";
import { WarLedger } from "./WarLedger";
import { DetailedMarketView } from "./DetailedMarketView";
import { LegalDesk } from "./LegalDesk";
import { WelcomeTerminal } from "./WelcomeTerminal";

const MissionControlModal = ({
  isOpen,
  onClose,
  friendlyBase,
  allyBases,
  neutralBases,
  hostileBases,
  aircrafts,
  onAssignMission
}: {
  isOpen: boolean,
  onClose: () => void,
  friendlyBase: any,
  allyBases: any[],
  neutralBases: any[],
  hostileBases: any[],
  aircrafts: any[],
  onAssignMission: (acId: string, mission: any) => void
}) => {
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null);
  const [missionType, setMissionType] = useState<MissionType>(MissionType.PATROL);
  const [escortId, setEscortId] = useState<string | null>(null);

  if (!isOpen) return null;

  const allBases = [friendlyBase, ...allyBases, ...neutralBases, ...hostileBases];
  const selectedBase = allBases.find(b => b.id === selectedBaseId);
  const availableAircrafts = aircrafts.filter(a => a.side === Side.FRIENDLY && a.status !== AircraftStatus.DESTROYED && a.status !== AircraftStatus.HANGAR);
  const availableEscorts = availableAircrafts.filter(a => a.id !== selectedAircraftId);

  const handleAssign = () => {
    if (!selectedAircraftId) return;

    let mission: any = {
      id: `mission-${Date.now()}`,
      type: missionType,
      priority: 1
    };

    if (selectedBase) {
      mission.targetId = selectedBase.id;
      mission.targetPos = { ...selectedBase.position };
    }

    if (missionType === MissionType.DEFENSE && escortId) {
      mission.escortId = escortId;
    }

    onAssignMission(selectedAircraftId, mission);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
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
              value={selectedAircraftId || ""}
              onChange={(e) => setSelectedAircraftId(e.target.value)}
              className="w-full bg-slate-800 border border-blue-500/30 p-3 rounded text-sm outline-none focus:border-blue-500"
            >
              <option value="">-- SELECT AIRCRAFT --</option>
              {availableAircrafts.map(ac => (
                <option key={ac.id} value={ac.id}>{ac.spec.model} ({ac.id.split('-')[0]})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] opacity-60 uppercase font-bold">2. Select Objective Base</label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 custom-scrollbar">
              {allBases.map(base => (
                <button
                  key={base.id}
                  onClick={() => setSelectedBaseId(base.id)}
                  className={cn(
                    "p-2 border text-[10px] text-left rounded transition-all",
                    selectedBaseId === base.id
                      ? "bg-blue-500/20 border-blue-500 text-blue-300"
                      : "bg-slate-800/50 border-blue-500/20 hover:bg-blue-500/10"
                  )}
                >
                  <div className="font-bold truncate">{base.name}</div>
                  <div className="opacity-60 text-[8px]">{base.side}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] opacity-60 uppercase font-bold">3. Mission Profile</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: MissionType.PATROL, icon: RotateCcw, label: "PATROL" },
                { type: MissionType.STRIKE, icon: Sword, label: "ATTACK" },
                { type: MissionType.CARGO, icon: Truck, label: "CARGO" },
                { type: MissionType.DEFENSE, icon: ShieldAlert, label: "DEFENSE" },
                { type: MissionType.LOITER, icon: Clock, label: "LOITER" },
                { type: MissionType.INTERCEPT, icon: Target, label: "INTERCEPT" },
              ].map(m => (
                <button
                  key={m.type}
                  onClick={() => setMissionType(m.type)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 border rounded transition-all",
                    missionType === m.type
                      ? "bg-blue-500/30 border-blue-500 text-blue-300"
                      : "bg-slate-800/50 border-blue-500/10 hover:bg-blue-500/10"
                  )}
                >
                  <m.icon size={16} />
                  <span className="text-[9px] font-bold">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {missionType === MissionType.DEFENSE && (
            <div className="space-y-2">
              <label className="text-[10px] opacity-60 uppercase font-bold">4. Select Escort (Optional)</label>
              <select
                value={escortId || ""}
                onChange={(e) => setEscortId(e.target.value)}
                className="w-full bg-slate-800 border border-blue-500/30 p-3 rounded text-sm outline-none focus:border-blue-500"
              >
                <option value="">-- NO ESCORT --</option>
                {availableEscorts.map(ac => (
                  <option key={ac.id} value={ac.id}>{ac.spec.model} ({ac.id.split('-')[0]})</option>
                ))}
              </select>
            </div>
          )}

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
  );
};

const TacticalAnalysisPanel = ({
  assessment,
  onClose,
  isAnalyzing
}: {
  assessment: TacticalAssessment | null,
  onClose: () => void,
  isAnalyzing: boolean
}) => {
  return (
    <AnimatePresence>
      {(isAnalyzing || assessment) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-32 left-1/2 -translate-x-1/2 w-[400px] z-[5000] pointer-events-auto"
        >
          <div className="bg-slate-900/95 backdrop-blur-xl border border-blue-500/40 rounded-xl p-4 shadow-2xl shadow-blue-500/20 font-mono">
            <div className="flex justify-between items-center mb-3 border-b border-blue-500/20 pb-2">
              <div className="flex items-center gap-2 text-blue-400">
                <Brain size={16} className="animate-pulse" />
                <span className="text-sm font-black uppercase tracking-tighter italic">Gemini Tactical AI</span>
              </div>
              <button onClick={onClose} className="text-blue-500/60 hover:text-red-500">
                <X size={16} />
              </button>
            </div>

            {isAnalyzing ? (
              <div className="py-8 flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <div className="text-xs text-blue-400 animate-pulse">ANALYZING BATTLESPACE DATA...</div>
              </div>
            ) : assessment ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] opacity-60 uppercase">Threat Level</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold",
                    assessment.threatLevel === "CRITICAL" ? "bg-red-500 text-white animate-pulse" :
                      assessment.threatLevel === "HIGH" ? "bg-orange-500 text-white" :
                        assessment.threatLevel === "MEDIUM" ? "bg-yellow-500 text-slate-900" : "bg-emerald-500 text-white"
                  )}>
                    {assessment.threatLevel}
                  </span>
                </div>

                <div className="text-[10px] leading-relaxed text-blue-300 italic">
                  "{assessment.summary}"
                </div>

                <div className="space-y-2">
                  <div className="text-[9px] opacity-40 uppercase font-black">Recommendations</div>
                  <div className="space-y-1">
                    {assessment.recommendations.map((rec, i) => (
                      <div key={i} className="flex gap-2 text-[10px] text-blue-400">
                        <ChevronRight size={10} className="shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {assessment.priorityTargets.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[9px] opacity-40 uppercase font-black">Priority Targets</div>
                    <div className="flex flex-wrap gap-2">
                      {assessment.priorityTargets.map((target, i) => (
                        <span key={i} className="px-2 py-1 bg-red-500/20 border border-red-500/40 text-red-400 text-[9px] rounded">
                          {target}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ScrambleModal = ({ isOpen, onClose, model, onScramble, bases, defaultBaseId }: {
  isOpen: boolean,
  onClose: () => void,
  model: string | null,
  onScramble: (model: string, config: any, baseId?: string) => void,
  bases?: { id: string, name: string }[],
  defaultBaseId?: string | null
}) => {
  const [selectedModel, setSelectedModel] = useState<string>(model || "F-16C");
  const [fuelLoad, setFuelLoad] = useState(100);
  const [missileLoad, setMissileLoad] = useState<Record<string, number>>({});
  const [flaresLoad, setFlaresLoad] = useState(0);
  const [gunAmmoLoad, setGunAmmoLoad] = useState(0);
  const [selectedMissileType, setSelectedMissileType] = useState<string>("");
  const [selectedBaseId, setSelectedBaseId] = useState<string>(defaultBaseId || bases?.[0]?.id || "");

  const friendlyAircraftTypes = Object.keys(AIRCRAFT_SPECS).filter(model =>
    AIRCRAFT_SPECS[model].missileCapacity && Object.keys(AIRCRAFT_SPECS[model].missileCapacity).length > 0
  );

  const spec = AIRCRAFT_SPECS[selectedModel as keyof typeof AIRCRAFT_SPECS];

  useEffect(() => {
    if (isOpen && model) {
      setSelectedModel(model);
    }
    if (isOpen && defaultBaseId) {
      setSelectedBaseId(defaultBaseId);
    }
  }, [isOpen, model, defaultBaseId]);

  useEffect(() => {
    if (spec) {
      setMissileLoad({ ...spec.missileCapacity });
      setFlaresLoad(spec.flaresCapacity || 0);
      setGunAmmoLoad(spec.gunAmmo || 0);
      const missileTypes = Object.keys(spec.missileCapacity);
      if (missileTypes.length > 0) {
        setSelectedMissileType(missileTypes[0]);
      }
    }
  }, [spec]);

  useEffect(() => {
    if (selectedModel && spec) {
      setMissileLoad({ ...spec.missileCapacity });
      const missileTypes = Object.keys(spec.missileCapacity);
      if (missileTypes.length > 0 && !missileTypes.includes(selectedMissileType)) {
        setSelectedMissileType(missileTypes[0]);
      }
    }
  }, [selectedModel]);

  if (!isOpen || !spec) return null;

  const handleLaunch = () => {
    onScramble(selectedModel, {
      fuel: (fuelLoad / 100) * spec.fuelCapacityL,
      missiles: missileLoad,
      flares: flaresLoad,
      gunAmmo: gunAmmoLoad
    }, selectedBaseId || undefined);
    onClose();
  };

  const missileTypes = Object.keys(spec.missileCapacity);

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
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
          {/* Base Selection */}
          {bases && bases.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] opacity-60 uppercase font-bold">Deploy From Base</label>
              <select
                value={selectedBaseId}
                onChange={(e) => setSelectedBaseId(e.target.value)}
                className="w-full bg-slate-800 border border-emerald-500/30 p-3 rounded text-sm outline-none focus:border-emerald-500 text-emerald-400"
              >
                {bases.map(base => (
                  <option key={base.id} value={base.id}>
                    {base.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Aircraft Type Selection - Scrollable List */}
          <div className="space-y-2">
            <label className="text-[10px] opacity-60 uppercase font-bold">Select Aircraft Type</label>
            <div className="max-h-40 overflow-y-auto bg-slate-800 border border-emerald-500/30 rounded">
              {friendlyAircraftTypes.map(acType => (
                <button
                  key={acType}
                  onClick={() => setSelectedModel(acType)}
                  className={cn(
                    "w-full p-2 text-left text-sm transition-colors flex justify-between items-center",
                    selectedModel === acType 
                      ? "bg-emerald-500/30 text-emerald-400" 
                      : "text-emerald-400/70 hover:bg-emerald-500/10"
                  )}
                >
                  <span>{AIRCRAFT_SPECS[acType].model}</span>
                  <span className="text-[10px] opacity-60">{acType}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center bg-emerald-500/5 p-3 rounded border border-emerald-500/10">
            <span className="text-sm opacity-60 uppercase">Airframe</span>
            <span className="text-lg font-bold text-emerald-400">{spec.model}</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs uppercase font-bold">
              <span>Fuel Loadout</span>
              <span className={cn(fuelLoad < 50 ? "text-yellow-500" : "text-emerald-400")}>{fuelLoad}%</span>
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

          {missileTypes.length > 0 && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] opacity-60 uppercase font-bold">Select Missile Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {missileTypes.map(mType => (
                    <button
                      key={mType}
                      onClick={() => setSelectedMissileType(mType)}
                      className={cn(
                        "p-2 border rounded text-[10px] font-bold transition-all",
                        selectedMissileType === mType
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                          : "bg-slate-800/50 border-emerald-500/20 hover:bg-emerald-500/10"
                      )}
                    >
                      {mType}
                    </button>
                  ))}
                </div>
              </div>

              {selectedMissileType && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs uppercase font-bold">
                    <span>Missile Payload ({selectedMissileType})</span>
                    <span className="text-emerald-400">{missileLoad[selectedMissileType] || 0}x</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={spec.missileCapacity[selectedMissileType]}
                    step="1"
                    value={missileLoad[selectedMissileType] || 0}
                    onChange={(e) => setMissileLoad({ ...missileLoad, [selectedMissileType]: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              )}
            </>
          )}

          {spec.gunAmmo > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs uppercase font-bold">
                <span>Gun Ammo</span>
                <span className="text-emerald-400">{gunAmmoLoad} Rounds</span>
              </div>
              <input
                type="range"
                min="0"
                max={spec.gunAmmo}
                step="50"
                value={gunAmmoLoad}
                onChange={(e) => setGunAmmoLoad(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          )}

          {spec.flaresCapacity && spec.flaresCapacity > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs uppercase font-bold">
                <span>Flares / Countermeasures</span>
                <span className="text-emerald-400">{flaresLoad} Units</span>
              </div>
              <input
                type="range"
                min="0"
                max={spec.flaresCapacity}
                step="10"
                value={flaresLoad}
                onChange={(e) => setFlaresLoad(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-500/20">
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
  );
};

export const HUD = () => {
  const {
    friendlyBase,
    hostileBases,
    allyBases,
    neutralBases,
    aircrafts,
    selectedAircraftId,
    missiles,
    logs,
    scramble,
    selectAircraft,
    setTarget,
    landAircraft,
    takeoff,
    pendingTargetId,
    confirmTarget,
    setPendingTarget,
    launchMissile,
    toggleECM,
    groups,
    createGroup,
    disbandGroup,
    setGroupMission,
    assignMission,
    cancelTarget,
    cancelMission,
    groundUnits,
    deployGroundUnit,
    setGroundUnitTarget,
    buildMode,
    outerBaseExpansionMode,
    selectedBuildingType,
    setBuildMode,
    setOuterBaseExpansionMode,
    setSelectedBuildingType,
    placeBuilding,
    pendingBuildings,
    assignAircraftToBuilding,
    newsEvents,
    expandBaseInner,
    expandBaseOuter,
    reloadCargo,
    crashHistory,
    stockMarket,
    lawsuits,
  } = useGameStore();

  const [leftDrawerOpen, setLeftDrawerOpen] = useState(true);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(true);
  const [scrambleModel, setScrambleModel] = useState<string | null>(null);
  const [isMissionControlOpen, setIsMissionControlOpen] = useState(false);
  const [tacticalAssessment, setTacticalAssessment] = useState<TacticalAssessment | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [isIncidentOpen, setIsIncidentOpen] = useState(false);
  const [showWarLedger, setShowWarLedger] = useState(false);
  const [showLegalDesk, setShowLegalDesk] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isBuildMenuOpen, setIsBuildMenuOpen] = useState(false);
  const [scrambleBaseId, setScrambleBaseId] = useState<string | null>(friendlyBase.id);
  const [landingBaseId, setLandingBaseId] = useState<string | null>(friendlyBase.id);

  const allBasesForScramble = useMemo(() => [friendlyBase, ...allyBases], [friendlyBase, allyBases]);

  const handleAnalyze = useCallback(() => {
    setIsAnalyzing(true);
    setTacticalAssessment(null);
    const result = analyzeThreatsAlgorithmic(friendlyBase, hostileBases, allyBases, aircrafts, missiles);
    setTacticalAssessment(result);
    setIsAnalyzing(false);
  }, [friendlyBase, hostileBases, allyBases, aircrafts, missiles]);

  const selectedAircraft = useMemo(() => aircrafts.find(a => a.id === selectedAircraftId), [aircrafts, selectedAircraftId]);
  const selectedBase = useMemo(() => friendlyBase.id === selectedAircraftId ? friendlyBase : (hostileBases.find(b => b.id === selectedAircraftId) || allyBases.find(b => b.id === selectedAircraftId) || neutralBases.find(b => b.id === selectedAircraftId)), [friendlyBase, selectedAircraftId, hostileBases, allyBases, neutralBases]);
  const selectedGroundUnit = useMemo(() => groundUnits.find(u => u.id === selectedAircraftId), [groundUnits, selectedAircraftId]);
  const group = useMemo(() => groups.find(g => g.leaderId === selectedAircraftId || g.memberIds.includes(selectedAircraftId || "")), [groups, selectedAircraftId]);
  const pendingTarget = useMemo(() => aircrafts.find(a => a.id === pendingTargetId) || hostileBases.find(b => b.id === pendingTargetId), [aircrafts, pendingTargetId, hostileBases]);

  // Auto-open right drawer when an aircraft or base is selected
  useEffect(() => {
    if (selectedAircraftId) setRightDrawerOpen(true);
  }, [selectedAircraftId]);

  const handleCreateGroup = (type: FormationType) => {
    if (!selectedAircraftId) return;
    const availableMembers = aircrafts
      .filter(a => a.side === Side.FRIENDLY && a.id !== selectedAircraftId && a.status !== AircraftStatus.DESTROYED && !groups.some(g => g.memberIds.includes(a.id)))
      .map(a => a.id);

    if (availableMembers.length > 0) {
      const groupName = `FLIGHT ${String.fromCharCode(65 + groups.length)}`;
      createGroup(selectedAircraftId, availableMembers, type, groupName);
    }
  };

  const handleMission = (type: MissionType) => {
    if (!selectedAircraft) return;
    const targetId = selectedAircraft.id;
    const missionId = `mission-${Date.now()}`;

    let mission: any;
    if (type === MissionType.LOITER) {
      mission = {
        id: missionId,
        type: MissionType.LOITER,
        targetPos: { ...selectedAircraft.position },
        priority: 1
      };
    } else if (type === MissionType.STRIKE) {
      // If we have a pending target, use it. Otherwise, nearest base.
      const targetBase = pendingTargetId && hostileBases.find(b => b.id === pendingTargetId)
        ? hostileBases.find(b => b.id === pendingTargetId)
        : hostileBases.sort((a, b) =>
          getDistanceKm(selectedAircraft.position, a.position) -
          getDistanceKm(selectedAircraft.position, b.position)
        )[0];

      if (targetBase) {
        mission = {
          id: missionId,
          type: MissionType.STRIKE,
          targetId: targetBase.id,
          priority: 2
        };
        setPendingTarget(null);
      }
    } else if (type === MissionType.PATROL) {
      mission = {
        id: missionId,
        type: MissionType.PATROL,
        priority: 1
      };
    }

    if (mission) {
      if (group) {
        setGroupMission(group.id, mission);
      } else {
        assignMission(targetId, mission);
      }
    }
  };

  // Fuel Estimate Calculation
  const getFuelEstimate = (ac: any) => {
    if (!ac) return null;
    const distToBase = getDistanceKm(ac.position, friendlyBase.position);
    const fuelNeeded = calculateFuelNeeded(distToBase, 0.8, ac.spec.fuelConsumptionBase);

    // Current consumption adjusted by speed
    const currentBurn = (ac.spec.fuelConsumptionBase) * (ac.speed / 0.8);
    const timeRemainingMin = ac.fuel / (currentBurn || 1);

    const isCritical = ac.fuel < fuelNeeded * 1.15; // Warning at 15% margin

    return {
      fuelNeeded,
      timeRemainingMin,
      isCritical
    };
  };

  const fuelEst = getFuelEstimate(selectedAircraft);

  const handleScrambleWithConfig = (model: string, config: any, baseId?: string) => {
    scramble(model, config, undefined, undefined, undefined, baseId);
  };

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col p-4 text-emerald-500 font-mono text-xs uppercase tracking-wider h-full overflow-hidden z-[4000]">

      <ScrambleModal
        isOpen={!!scrambleModel}
        onClose={() => setScrambleModel(null)}
        model={scrambleModel}
        onScramble={handleScrambleWithConfig}
        bases={allBasesForScramble}
        defaultBaseId={scrambleBaseId}
      />

      <MissionControlModal
        isOpen={isMissionControlOpen}
        onClose={() => setIsMissionControlOpen(false)}
        friendlyBase={friendlyBase}
        allyBases={allyBases}
        neutralBases={neutralBases}
        hostileBases={hostileBases}
        aircrafts={aircrafts}
        onAssignMission={assignMission}
      />

      <TacticalAnalysisPanel
        assessment={tacticalAssessment}
        isAnalyzing={isAnalyzing}
        onClose={() => setTacticalAssessment(null)}
      />

      <NewsModal
        isOpen={isNewsOpen}
        onClose={() => setIsNewsOpen(false)}
        news={newsEvents}
        aircrafts={aircrafts}
        allyAircrafts={aircrafts}
      />

      <IncidentReportModal
        isOpen={isIncidentOpen}
        onClose={() => setIsIncidentOpen(false)}
        incidents={crashHistory}
      />

      {showWarLedger && (
        <div className="fixed inset-0 z-[5500] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -20 }}
            className="bg-slate-900/95 border border-cyan-500/40 rounded-lg p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl shadow-black/50"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-cyan-400 flex items-center gap-2">
                <TrendingUp size={20} />
                FACTION MARKETS
              </h2>
              <button
                onClick={() => setShowWarLedger(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <DetailedMarketView stockMarket={stockMarket} />
          </motion.div>
        </div>
      )}

      {showLegalDesk && (
        <div className="fixed inset-0 z-[5500] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -20 }}
            className="bg-slate-900/95 border border-green-500/40 rounded-lg p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl shadow-black/50"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-green-400 flex items-center gap-2">
                ⚖️ TRIBUNAL DE ESTRATOSFERA
              </h2>
              <button
                onClick={() => setShowLegalDesk(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <LegalDesk />
          </motion.div>
        </div>
      )}

      <WelcomeTerminal isOpen={showWelcome} onClose={() => setShowWelcome(false)} />

      {isBuildMenuOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[6000] pointer-events-auto" onClick={() => setIsBuildMenuOpen(false)}>
          <div className="bg-slate-900 border border-amber-500/40 p-6 rounded-lg max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
                <Construction size={24} />
                BASE EXPANSION
              </h2>
              <button onClick={() => setIsBuildMenuOpen(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-amber-400 text-sm mb-2 font-bold">INNER BASE UPGRADES (Instant)</p>
              
              <button
                onClick={() => { expandBaseInner('HANGAR'); setIsBuildMenuOpen(false); }}
                className="w-full p-3 bg-emerald-900/30 border border-emerald-500/40 hover:border-emerald-400 rounded-lg flex justify-between items-center transition-all"
              >
                <div className="text-left">
                  <div className="text-emerald-400 font-bold">Upgrade Hangar</div>
                  <div className="text-xs text-slate-400">+2 max aircraft</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-bold">20,000Cr</div>
                </div>
              </button>

              <button
                onClick={() => { expandBaseInner('RADAR'); setIsBuildMenuOpen(false); }}
                className="w-full p-3 bg-emerald-900/30 border border-emerald-500/40 hover:border-emerald-400 rounded-lg flex justify-between items-center transition-all"
              >
                <div className="text-left">
                  <div className="text-emerald-400 font-bold">Upgrade Radar</div>
                  <div className="text-xs text-slate-400">+100km detection</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-bold">30,000Cr</div>
                </div>
              </button>

              <button
                onClick={() => { expandBaseInner('FUEL'); setIsBuildMenuOpen(false); }}
                className="w-full p-3 bg-emerald-900/30 border border-emerald-500/40 hover:border-emerald-400 rounded-lg flex justify-between items-center transition-all"
              >
                <div className="text-left">
                  <div className="text-emerald-400 font-bold">Upgrade Fuel Storage</div>
                  <div className="text-xs text-slate-400">+50,000L capacity</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-bold">15,000Cr</div>
                </div>
              </button>

              <button
                onClick={() => { expandBaseInner('DEFENSE'); setIsBuildMenuOpen(false); }}
                className="w-full p-3 bg-emerald-900/30 border border-emerald-500/40 hover:border-emerald-400 rounded-lg flex justify-between items-center transition-all"
              >
                <div className="text-left">
                  <div className="text-emerald-400 font-bold">Add SAM Battery</div>
                  <div className="text-xs text-slate-400">Auto-defense</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-bold">50,000Cr</div>
                </div>
              </button>

              <div className="border-t border-slate-700 my-4"></div>
              
              <p className="text-blue-400 text-sm mb-2 font-bold">OUTER BASE EXPANSION (Select on Map)</p>

              <button
                onClick={() => { setOuterBaseExpansionMode(true); setIsBuildMenuOpen(false); }}
                className="w-full p-3 bg-blue-900/30 border border-blue-500/40 hover:border-blue-400 rounded-lg flex justify-between items-center transition-all"
              >
                <div className="text-left">
                  <div className="text-blue-400 font-bold">Build Forward Base</div>
                  <div className="text-xs text-slate-400">Click map to select location</div>
                </div>
                <div className="text-right">
                  <div className="text-blue-400 font-bold">75,000Cr</div>
                  <div className="text-xs text-orange-400">+30,000L fuel</div>
                </div>
              </button>

              <div className="border-t border-slate-700 my-4"></div>

              <p className="text-slate-400 text-sm mb-4">STRUCTURES (Select position on map):</p>

              <button
                onClick={() => { setSelectedBuildingType(BuildingType.HANGAR); setBuildMode(true); setIsBuildMenuOpen(false); }}
                className="w-full p-3 bg-slate-800 border border-slate-700 hover:border-amber-500/60 rounded-lg flex justify-between items-center transition-all"
              >
                <div className="text-left">
                  <div className="text-amber-400 font-bold">Hangar</div>
                  <div className="text-xs text-slate-400">+2 max aircraft</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-bold">15,000Cr</div>
                  <div className="text-xs text-red-400">200Cr/hr</div>
                </div>
              </button>

              <button
                onClick={() => { setSelectedBuildingType(BuildingType.RADAR); setBuildMode(true); setIsBuildMenuOpen(false); }}
                className="w-full p-3 bg-slate-800 border border-slate-700 hover:border-amber-500/60 rounded-lg flex justify-between items-center transition-all"
              >
                <div className="text-left">
                  <div className="text-amber-400 font-bold">Long-Range Radar</div>
                  <div className="text-xs text-slate-400">+200km detection</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-bold">25,000Cr</div>
                  <div className="text-xs text-red-400">800Cr/hr</div>
                </div>
              </button>

              <button
                onClick={() => { setSelectedBuildingType(BuildingType.SAM_BATTERY); setBuildMode(true); setIsBuildMenuOpen(false); }}
                className="w-full p-3 bg-slate-800 border border-slate-700 hover:border-amber-500/60 rounded-lg flex justify-between items-center transition-all"
              >
                <div className="text-left">
                  <div className="text-amber-400 font-bold">SAM Battery</div>
                  <div className="text-xs text-slate-400">Auto-engage threats</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-bold">40,000Cr</div>
                  <div className="text-xs text-red-400">1,500Cr/hr</div>
                </div>
              </button>

              <button
                onClick={() => { setSelectedBuildingType(BuildingType.FUEL_DEPOT); setBuildMode(true); setIsBuildMenuOpen(false); }}
                className="w-full p-3 bg-slate-800 border border-slate-700 hover:border-amber-500/60 rounded-lg flex justify-between items-center transition-all"
              >
                <div className="text-left">
                  <div className="text-amber-400 font-bold">Fuel Depot</div>
                  <div className="text-xs text-slate-400">+50,000L storage</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-bold">10,000Cr</div>
                  <div className="text-xs text-red-400">100Cr/hr</div>
                </div>
              </button>

              <button
                onClick={() => { setSelectedBuildingType(BuildingType.RUNWAY); setBuildMode(true); setIsBuildMenuOpen(false); }}
                className="w-full p-3 bg-slate-800 border border-slate-700 hover:border-amber-500/60 rounded-lg flex justify-between items-center transition-all"
              >
                <div className="text-left">
                  <div className="text-amber-400 font-bold">Secondary Runway</div>
                  <div className="text-xs text-slate-400">Parallel takeoffs</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-bold">50,000Cr</div>
                  <div className="text-xs text-red-400">500Cr/hr</div>
                </div>
              </button>
            </div>

            {pendingBuildings.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-700">
                <h3 className="text-amber-400 font-bold mb-3 flex items-center gap-2">
                  <Truck size={16} />
                  Construções Pendentes
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {pendingBuildings.map(building => (
                    <div key={building.id} className="p-2 bg-slate-800 border border-slate-600 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-amber-400 font-bold">{building.type}</span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded",
                          building.status === 'PENDING' && "bg-yellow-500/20 text-yellow-400",
                          building.status === 'IN_TRANSIT' && "bg-blue-500/20 text-blue-400"
                        )}>
                          {building.status === 'PENDING' ? 'Aguardando C-130' : 'Em trânsito'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mb-2">
                        Posição: {building.position.lat.toFixed(2)}, {building.position.lng.toFixed(2)}
                      </div>
                      {building.status === 'PENDING' && (
                        <div className="text-xs text-slate-400 mb-2">
                          Selecione uma aeronave e clique em "Atribuir" para enviar C-130:
                        </div>
                      )}
                      {building.status === 'PENDING' && (
                        <div className="flex flex-wrap gap-1">
                          {aircrafts.filter(a => a.side === Side.FRIENDLY && a.status === AircraftStatus.HANGAR).map(ac => (
                            <button
                              key={ac.id}
                              onClick={() => assignAircraftToBuilding(building.id, ac.id)}
                              className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded text-xs hover:bg-emerald-500/40"
                            >
                              {ac.spec.model}
                            </button>
                          ))}
                          {aircrafts.filter(a => a.side === Side.FRIENDLY && a.status === AircraftStatus.HANGAR).length === 0 && (
                            <span className="text-xs text-slate-500">Nenhuma aeronave disponível no hangar</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {friendlyBase.credits < 10000 && (
              <p className="text-red-400 text-sm mt-4 text-center">Credits insuficientes para construir!</p>
            )}
          </div>
        </div>
      )}

      {buildMode && selectedBuildingType && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-amber-500/20 border border-amber-500/60 px-4 py-2 rounded-lg z-40">
          <div className="flex items-center gap-3">
            <span className="text-amber-400 font-bold">Clique no mapa para construir {selectedBuildingType}</span>
            <button
              onClick={() => { setBuildMode(false); setSelectedBuildingType(null); }}
              className="px-2 py-1 bg-red-500/20 border border-red-500/40 text-red-400 rounded text-sm hover:bg-red-500/40"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Top Bar - Resources */}
      <div className="w-full flex justify-between items-start pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 p-3 rounded-lg mb-4 shadow-2xl shadow-black/50">
        <div className="flex gap-4 md:gap-8 overflow-x-auto no-scrollbar items-center">
          <div className="flex flex-col min-w-max">
            <span className="text-[10px] text-emerald-500/60 flex items-center gap-1">
              <Shield size={10} /> Credits
            </span>
            <span className="text-base md:text-lg font-bold text-emerald-400">
              ${friendlyBase.credits.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col min-w-max">
            <span className="text-[10px] text-emerald-500/60 flex items-center gap-1">
              <Fuel size={10} /> JP-8 Fuel
            </span>
            <span className={cn(
              "text-base md:text-lg font-bold",
              friendlyBase.fuelStock < 10000 ? "text-red-500 animate-pulse" : "text-emerald-400"
            )}>
              {friendlyBase.fuelStock.toLocaleString()}L
            </span>
          </div>

          <div className="h-8 w-px bg-emerald-500/20 mx-2" />

          <div className="flex gap-2">
            <button
              onClick={() => setIsMissionControlOpen(true)}
              className="p-2 bg-blue-500/20 border border-blue-500/40 rounded hover:bg-blue-500/40 transition-all text-blue-400 flex items-center gap-2"
              title="Mission Control"
            >
              <Navigation size={18} />
              <span className="hidden md:inline text-[10px] font-black">MISSION CONTROL</span>
            </button>
            <button
              onClick={() => setScrambleModel("F-16C")}
              className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded hover:bg-emerald-500/40 transition-all text-emerald-400 flex items-center gap-2"
              title="Command Scramble"
            >
              <Zap size={18} />
              <span className="hidden md:inline text-[10px] font-black">SCRAMBLE</span>
            </button>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className={cn(
                "p-2 bg-purple-500/20 border border-purple-500/40 rounded hover:bg-purple-500/40 transition-all text-purple-400 flex items-center gap-2",
                isAnalyzing && "animate-pulse opacity-50"
              )}
              title="Tactical Analysis"
            >
              <Brain size={18} />
              <span className="hidden md:inline text-[10px] font-black">INTEL</span>
            </button>
            <button
              onClick={() => setIsNewsOpen(true)}
              className="p-2 bg-neutral-500/20 border border-neutral-500/40 rounded hover:bg-neutral-500/40 transition-all text-neutral-400 flex items-center gap-2"
              title="News"
            >
              <Newspaper size={18} />
              <span className="hidden md:inline text-[10px] font-black">NEWS</span>
            </button>
            <button
              onClick={() => setShowWarLedger(true)}
              className="p-2 bg-cyan-500/20 border border-cyan-500/40 rounded hover:bg-cyan-500/40 transition-all text-cyan-400 flex items-center gap-2"
              title="Faction Markets"
            >
              <TrendingUp size={18} />
              <span className="hidden md:inline text-[10px] font-black">MARKETS</span>
            </button>
            <button
              onClick={() => setShowLegalDesk(true)}
              className={cn(
                "p-2 border rounded hover:bg-green-500/40 flex items-center gap-2 transition-all",
                lawsuits.filter(l => l.status === 'PENDING' || l.status === 'CONTESTED').length > 0
                  ? "bg-green-500/20 border-green-500/40 text-green-400"
                  : "bg-slate-500/20 border-slate-500/40 text-slate-400"
              )}
              title="Legal Tribunal"
            >
              <Scale size={18} />
              <span className="hidden md:inline text-[10px] font-black">{lawsuits.filter(l => l.status === 'PENDING' || l.status === 'CONTESTED').length}</span>
            </button>
            <button
              onClick={() => setIsIncidentOpen(true)}
              className={cn(
                "p-2 border rounded hover:bg-red-500/40 flex items-center gap-2 transition-all",
                crashHistory.length > 0
                  ? "bg-red-500/20 border-red-500/40 text-red-400"
                  : "bg-slate-500/20 border-slate-500/40 text-slate-400"
              )}
              title="Incident Report"
            >
              <AlertTriangle size={18} />
              <span className="hidden md:inline text-[10px] font-black">{crashHistory.length}</span>
            </button>
            <button
              onClick={() => setIsBuildMenuOpen(true)}
              className={cn(
                "p-2 border rounded flex items-center gap-2 transition-all",
                buildMode
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                  : "bg-amber-500/20 border-amber-500/40 rounded hover:bg-amber-500/40 text-amber-400"
              )}
              title="Base Expansion"
            >
              <Hammer size={18} />
              <span className="hidden md:inline text-[10px] font-black">BUILD</span>
            </button>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <div className="text-xl font-black italic tracking-tighter text-emerald-500">AIR STRIKE</div>
          <div className="text-[10px] opacity-60">Tactical Command Console v1.0</div>
        </div>
      </div>

      <div className="flex-1 flex justify-between gap-4 overflow-hidden min-h-0 relative">

        {/* Left Drawer Toggle */}
        <button
          onClick={() => setLeftDrawerOpen(!leftDrawerOpen)}
          className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-auto bg-slate-900 border border-emerald-500/30 p-1 rounded-r-md z-50 hover:bg-emerald-500/10 transition-colors"
        >
          {leftDrawerOpen ? <ChevronLeft size={16} /> : <Menu size={16} />}
        </button>

        {/* Left Panel - Asset Management */}
        <AnimatePresence>
          {leftDrawerOpen && (
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="w-64 md:w-72 flex flex-col gap-4 pointer-events-auto overflow-hidden bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 rounded-lg p-2 shadow-2xl"
            >
              <div className="bg-emerald-500/10 p-2 border-b border-emerald-500/30 flex items-center gap-2 sticky top-0 z-10">
                <Plane size={14} /> Aircraft Assets
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {/* Groups first */}
                {groups.map(group => {
                  const leader = aircrafts.find(a => a.id === group.leaderId);
                  if (!leader) return null;
                  const members = group.memberIds.map(id => aircrafts.find(a => a.id === id)).filter(Boolean);

                  return (
                    <div key={group.id} className="border border-emerald-500/40 rounded-lg overflow-hidden bg-emerald-500/5 mb-2">
                      <div className="bg-emerald-500/20 p-1 px-2 text-[10px] font-bold flex justify-between items-center">
                        <span className="flex items-center gap-1"><Shield size={10} /> {group.name}</span>
                        <span className="opacity-60 text-[8px]">{group.type}</span>
                      </div>
                      <div className="p-1 space-y-1">
                        {[leader, ...members].map(ac => {
                          if (!ac) return null;
                          const est = getFuelEstimate(ac);
                          return (
                            <div
                              key={ac.id}
                              onClick={() => selectAircraft(ac.id)}
                              className={cn(
                                "p-1.5 border border-emerald-500/10 rounded cursor-pointer transition-colors text-[10px]",
                                selectedAircraftId === ac.id ? "bg-emerald-500/20 border-emerald-500" : "hover:bg-emerald-500/10",
                                ac.id === group.leaderId ? "border-l-2 border-l-emerald-400" : "ml-2 opacity-80"
                              )}
                            >
                              <div className="flex justify-between items-center">
                                <span className="truncate flex items-center gap-1">
                                  {ac.id === group.leaderId && <Target size={8} className="text-emerald-400" />}
                                  {ac.spec.model}
                                </span>
                                <div className="flex items-center gap-2">
                                  {est?.isCritical && <AlertTriangle size={8} className="text-red-500 animate-pulse" />}
                                  <span className={cn(
                                    "text-[8px] px-1 rounded",
                                    ac.status === AircraftStatus.COMBAT ? "bg-red-500/20 text-red-400" : "bg-emerald-500/10"
                                  )}>{ac.status}</span>
                                  <span className="w-8 text-right">{Math.round((ac.fuel / ac.spec.fuelCapacityL) * 100)}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Ungrouped aircraft - Only active ones */}
                {aircrafts.filter(a => a.side === Side.FRIENDLY && a.status !== AircraftStatus.HANGAR && !groups.some(g => g.memberIds.includes(a.id))).map(ac => {
                  const est = getFuelEstimate(ac);
                  return (
                    <div
                      key={ac.id}
                      onClick={() => selectAircraft(ac.id)}
                      className={cn(
                        "p-2 border border-emerald-500/20 rounded cursor-pointer transition-colors",
                        selectedAircraftId === ac.id ? "bg-emerald-500/20 border-emerald-500" : "hover:bg-emerald-500/10",
                        ac.status === AircraftStatus.DESTROYED ? "opacity-30 grayscale" : "",
                        ac.isDamaged || est?.isCritical ? "border-red-500/50" : ""
                      )}
                    >
                      <div className="flex justify-between font-bold">
                        <span className="truncate mr-1 flex items-center gap-1">
                          {ac.spec.model}
                          {(missiles.some(m => m.targetId === ac.id) || est?.isCritical) && <AlertTriangle size={10} className="text-red-500 animate-pulse" />}
                        </span>
                        <span className="text-[10px] opacity-60 shrink-0">{ac.id.split('-')[0]}</span>
                      </div>
                      <div className="flex justify-between text-[10px] mt-1">
                        <span className={ac.isDamaged ? "text-red-400" : ""}>{ac.status}</span>
                        <span className={cn(ac.fuel < 500 || est?.isCritical ? "text-red-500" : "")}>
                          {Math.round((ac.fuel / ac.spec.fuelCapacityL) * 100)}% FUEL
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Ground Units */}
                <div className="bg-emerald-500/10 p-2 border-y border-emerald-500/30 flex items-center gap-2 sticky top-0 z-10">
                  <Shield size={14} /> Ground Defenses
                </div>
                <div className="space-y-2 p-2">
                  {groundUnits.filter(u => u.side === Side.FRIENDLY).map(u => (
                    <div
                      key={u.id}
                      onClick={() => selectAircraft(u.id)}
                      className={cn(
                        "p-2 border border-emerald-500/20 rounded cursor-pointer transition-colors",
                        selectedAircraftId === u.id ? "bg-emerald-500/20 border-emerald-500" : "hover:bg-emerald-500/10"
                      )}
                    >
                      <div className="flex justify-between font-bold">
                        <span className="truncate mr-1">{u.type}</span>
                        <span className="text-[10px] opacity-60 shrink-0">{u.id.split('-')[0]}</span>
                      </div>
                      <div className="flex justify-between text-[10px] mt-1">
                         <span>{u.status}</span>
                         <span>{u.missiles ? Object.values(u.missiles).reduce((sum, count) => sum + count, 0) : 0} MISSILES</span>
                       </div>
                    </div>
                  ))}
                  {groundUnits.filter(u => u.side === Side.FRIENDLY).length === 0 && (
                    <div className="text-center py-2 opacity-40 italic">No ground units deployed</div>
                  )}
                </div>
                {aircrafts.filter(a => a.side === Side.FRIENDLY).length === 0 && (
                  <div className="text-center py-4 opacity-40 italic">No assets deployed</div>
                )}
              </div>

              <div className="bg-slate-900/90 border-t border-emerald-500/30 p-3 shrink-0">
                <div className="text-[10px] opacity-60 mb-2">Ground Deployment</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => deployGroundUnit("S-400", friendlyBase.position)}
                    className="p-2 border border-blue-500/30 rounded hover:bg-blue-500/20 transition-colors text-center text-[10px] font-bold text-blue-400"
                  >
                    DEPLOY S-400
                  </button>
                  <button
                    onClick={() => deployGroundUnit("PATRIOT", friendlyBase.position)}
                    className="p-2 border border-blue-500/30 rounded hover:bg-blue-500/20 transition-colors text-center text-[10px] font-bold text-blue-400"
                  >
                    DEPLOY PATRIOT
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Drawer Toggle */}
        <button
          onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
          className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-auto bg-slate-900 border border-emerald-500/30 p-1 rounded-l-md z-50 hover:bg-emerald-500/10 transition-colors"
        >
          {rightDrawerOpen ? <ChevronRight size={16} /> : <Menu size={16} />}
        </button>

        {/* Right Panel - Target Intel & Mission Control */}
        <AnimatePresence>
          {rightDrawerOpen && (selectedAircraft || selectedBase || selectedGroundUnit) && (
            <motion.div
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              className="w-64 md:w-72 flex flex-col gap-4 pointer-events-auto overflow-y-auto custom-scrollbar bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 rounded-lg p-2 shadow-2xl"
            >
              <div className="bg-emerald-500/10 p-2 border-b border-emerald-500/30 flex items-center gap-2">
                <Activity size={14} /> Intelligence Report
              </div>
              <div className="p-3 space-y-3">
                {selectedBase && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-500/60">Base Identification</span>
                      <span className={cn(
                        "font-bold px-2 py-0.5 rounded",
                        selectedBase.side === Side.FRIENDLY ? "bg-emerald-500/20 text-emerald-400" : selectedBase.side === Side.ALLY ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
                      )}>
                        {selectedBase.side}
                      </span>
                    </div>
                    <div className="text-lg font-bold text-emerald-400">{selectedBase.name}</div>
                    
                    <div className="grid grid-cols-2 gap-2 p-2 bg-slate-800/50 rounded">
                      <div>
                        <div className="text-[9px] opacity-50">RADAR RANGE</div>
                        <div className="text-xs font-bold">{selectedBase.radarRange} km</div>
                      </div>
                      <div>
                        <div className="text-[9px] opacity-50">MAX AIRCRAFT</div>
                        <div className="text-xs font-bold">{selectedBase.maxAircraft}</div>
                      </div>
                      <div>
                        <div className="text-[9px] opacity-50">BUILDINGS</div>
                        <div className="text-xs font-bold">{selectedBase.buildings.length}</div>
                      </div>
                      <div>
                        <div className="text-[9px] opacity-50">CREDITS</div>
                        <div className="text-xs font-bold">{selectedBase.credits.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    {selectedBase.buildings.length > 0 && (
                      <div className="p-2 bg-slate-800/30 rounded">
                        <div className="text-[9px] opacity-50 mb-1">INFRASTRUCTURE</div>
                        <div className="flex flex-wrap gap-1">
                          {selectedBase.buildings.map((b, i) => (
                            <span key={i} className="text-[8px] px-1 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                              {b.type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedBase.side === Side.HOSTILE && (
                      <div className="p-2 bg-red-500/10 border border-red-500/30 rounded">
                        <div className="text-[9px] text-red-400 mb-1 flex items-center gap-1">
                          <AlertTriangle size={10} /> THREAT ASSESSMENT
                        </div>
                        <div className="text-xs text-red-300">
                          {aircrafts.filter(a => a.side === Side.HOSTILE && getDistanceKm(a.position, selectedBase.position) < 50).length > 0 
                            ? `ACTIVE AIRCRAFT: ${aircrafts.filter(a => a.side === Side.HOSTILE && getDistanceKm(a.position, selectedBase.position) < 50).length}`
                            : "NO ACTIVE AIRCRAFT DETECTED"
                          }
                        </div>
                      </div>
                    )}

                    {selectedBase.side === Side.ALLY && (
                      <div className="pt-2 border-t border-emerald-500/20 space-y-3">
                        <div className="text-[10px] opacity-60 mb-2 uppercase tracking-widest font-black">Ally Operations</div>

                        {/* Landing Action */}
                        {aircrafts.some(a => a.side === Side.FRIENDLY && getDistanceKm(a.position, selectedBase.position) < 100) && (
                          <button
                            onClick={() => {
                              const nearbyFriendlies = aircrafts.filter(a => a.side === Side.FRIENDLY && getDistanceKm(a.position, selectedBase.position) < 100);
                              nearbyFriendlies.forEach(ac => {
                                assignMission(ac.id, {
                                  type: MissionType.LOITER,
                                  targetPos: { ...selectedBase.position }
                                });
                              });
                            }}
                            className="w-full py-2 bg-blue-500/20 border border-blue-500/40 text-blue-400 font-bold text-[10px] hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2"
                          >
                            <Navigation size={12} /> REQUEST GROUP LANDING
                          </button>
                        )}

                        {/* Reinforcement Scramble */}
                        <div className="space-y-1">
                          <div className="text-[8px] opacity-40 uppercase">Deploy From</div>
                          <select
                            value={scrambleBaseId || ''}
                            onChange={(e) => setScrambleBaseId(e.target.value)}
                            className="w-full py-1 bg-slate-800 border border-slate-600 text-[9px] text-slate-300 rounded mb-1"
                          >
                            {allBasesForScramble.map(base => (
                              <option key={base.id} value={base.id}>{base.name}</option>
                            ))}
                          </select>
                          <div className="text-[8px] opacity-40 uppercase">Request Reinforcements</div>
                          <div className="grid grid-cols-3 gap-1">
                            <button
                              onClick={() => scramble("Gripen", { fuelL: 3000 }, undefined, undefined, undefined, scrambleBaseId || undefined)}
                              className="py-1 bg-emerald-500/10 border border-emerald-500/30 text-[9px] hover:bg-emerald-500/20 transition-colors"
                            >
                              GRIPEN
                            </button>
                            <button
                              onClick={() => scramble("F-16C", { fuelL: 3500 }, undefined, undefined, undefined, scrambleBaseId || undefined)}
                              className="py-1 bg-emerald-500/10 border border-emerald-500/30 text-[9px] hover:bg-emerald-500/20 transition-colors"
                            >
                              F-16C
                            </button>
                            <button
                              onClick={() => scramble("F-35A", { fuelL: 8000 }, undefined, undefined, undefined, scrambleBaseId || undefined)}
                              className="py-1 bg-emerald-500/10 border border-emerald-500/30 text-[9px] hover:bg-emerald-500/20 transition-colors"
                            >
                              F-35A
                            </button>
                            <button
                              onClick={() => scramble("Su-27", { fuelL: 9000 }, undefined, undefined, undefined, scrambleBaseId || undefined)}
                              className="py-1 bg-emerald-500/10 border border-emerald-500/30 text-[9px] hover:bg-emerald-500/20 transition-colors"
                            >
                              SU-27
                            </button>
                            <button
                              onClick={() => scramble("MiG-29", { fuelL: 3500 }, undefined, undefined, undefined, scrambleBaseId || undefined)}
                              className="py-1 bg-emerald-500/10 border border-emerald-500/30 text-[9px] hover:bg-emerald-500/20 transition-colors"
                            >
                              MIG-29
                            </button>
                            <button
                              onClick={() => scramble("B-2", { fuelL: 70000 }, undefined, undefined, undefined, scrambleBaseId || undefined)}
                              className="py-1 bg-emerald-500/10 border border-emerald-500/30 text-[9px] hover:bg-emerald-500/20 transition-colors"
                            >
                              B-2
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedAircraft && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-500/60">Identification</span>
                      <span className={cn(
                        "font-bold px-2 py-0.5 rounded",
                        selectedAircraft.side === Side.FRIENDLY ? "bg-blue-500/20 text-blue-400" : selectedAircraft.side === Side.ALLY ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                      )}>
                        {selectedAircraft.side}
                      </span>
                    </div>

                    {/* IFF Status */}
                    {selectedAircraft.iffStatus && (
                      <div className="flex justify-between items-center">
                        <span className="text-emerald-500/60 flex items-center gap-1">
                          <Antenna size={10} /> IFF
                        </span>
                        <span className={cn(
                          "font-bold px-2 py-0.5 rounded text-[10px]",
                          selectedAircraft.iffStatus === IFFStatus.FRIENDLY ? "bg-blue-500/20 text-blue-400" :
                            selectedAircraft.iffStatus === IFFStatus.HOSTILE ? "bg-red-500/20 text-red-400" :
                              selectedAircraft.iffStatus === IFFStatus.IDENTIFIED ? "bg-yellow-500/20 text-yellow-400" :
                                "bg-gray-500/20 text-gray-400"
                        )}>
                          {selectedAircraft.iffStatus}
                        </span>
                      </div>
                    )}

                    {/* RWR Status */}
                    {selectedAircraft.side !== Side.FRIENDLY && selectedAircraft.rwrStatus && (
                      <div className="flex justify-between items-center">
                        <span className="text-emerald-500/60 flex items-center gap-1">
                          <Radio size={10} /> RWR
                        </span>
                        <span className={cn(
                          "font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1",
                          selectedAircraft.rwrStatus === RWRStatus.SILENT ? "bg-green-500/20 text-green-400" :
                            selectedAircraft.rwrStatus === RWRStatus.SEARCH ? "bg-yellow-500/20 text-yellow-400 animate-pulse" :
                              selectedAircraft.rwrStatus === RWRStatus.TRACK ? "bg-orange-500/20 text-orange-400 animate-pulse" :
                                selectedAircraft.rwrStatus === RWRStatus.MISSILE ? "bg-red-500/20 text-red-400 animate-pulse" :
                                  "bg-gray-500/20 text-gray-400"
                        )}>
                          {selectedAircraft.rwrStatus === RWRStatus.MISSILE && <AlertTriangle size={10} />}
                          {selectedAircraft.rwrStatus}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] opacity-60">Altitude</div>
                        <div className="text-sm font-bold">{Math.round(selectedAircraft.altitude).toLocaleString()} FT</div>
                      </div>
                      <div>
                        <div className="text-[10px] opacity-60">Speed</div>
                        <div className="text-sm font-bold">MACH {selectedAircraft.speed.toFixed(2)}</div>
                      </div>
                    </div>

                    {/* Fuel Estimate System */}
                    <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">
                      <div className="flex items-center gap-2 text-emerald-500/60 mb-2">
                        <Clock size={12} />
                        <span className="text-[10px]">Fuel Estimate</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-[10px] opacity-60">Time Remaining:</span>
                          <span className={cn("font-bold", fuelEst?.isCritical ? "text-red-500" : "")}>
                            {Math.floor(fuelEst?.timeRemainingMin || 0)} MIN
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[10px] opacity-60">Fuel to Base:</span>
                          <span className="font-bold">{Math.round(fuelEst?.fuelNeeded || 0)} L</span>
                        </div>
                        {fuelEst?.isCritical && (
                          <div className="text-[8px] text-red-500 font-bold animate-pulse mt-1">
                            CRITICAL: RETURN TO BASE ASAP
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-emerald-500/20">
                      <div className="text-[10px] opacity-60 mb-1">Target Status</div>
                      <div className="text-xs font-bold truncate flex items-center gap-2">
                        {selectedAircraft.targetId ? (
                          <>
                            <Target size={12} className="text-red-500 animate-pulse" />
                            LOCKED: {selectedAircraft.targetId.split('-')[0]}
                          </>
                        ) : "NO TARGET"}
                      </div>
                    </div>

                    {selectedAircraft.side === Side.FRIENDLY && selectedAircraft.status !== AircraftStatus.DESTROYED && (
                      <div className="space-y-4">

                        {/* Mission Control Section */}
                        <div className="pt-2 border-t border-emerald-500/20 bg-emerald-500/5 p-2 rounded">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Navigation size={14} className="text-emerald-400" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Mission Control</span>
                            </div>
                            {group && <span className="text-[8px] bg-emerald-500/20 px-1 rounded">{group.name}</span>}
                          </div>

                          <div className="grid grid-cols-3 gap-1">
                            <button
                              onClick={() => handleMission(MissionType.PATROL)}
                              className="flex flex-col items-center gap-1 p-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded transition-all active:scale-95"
                            >
                              <RotateCcw size={12} />
                              <span className="text-[8px] font-bold">PATROL</span>
                            </button>
                            <button
                              onClick={() => handleMission(MissionType.LOITER)}
                              className="flex flex-col items-center gap-1 p-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded transition-all active:scale-95"
                            >
                              <Activity size={12} />
                              <span className="text-[8px] font-bold">LOITER</span>
                            </button>
                            <button
                              onClick={() => handleMission(MissionType.STRIKE)}
                              className="flex flex-col items-center gap-1 p-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded transition-all active:scale-95 text-red-400"
                            >
                              <Target size={12} />
                              <span className="text-[8px] font-bold">STRIKE</span>
                            </button>
                          </div>
                        </div>

                        {pendingTargetId && (
                          <div className="p-2 bg-yellow-500/10 border border-yellow-500/50 rounded animate-pulse">
                            <div className="text-[10px] text-yellow-500 font-bold mb-1 flex items-center gap-1">
                              <Target size={12} /> CONFIRM TARGET?
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => confirmTarget()}
                                className="flex-1 py-1 bg-yellow-500 text-slate-900 font-bold text-[10px] hover:bg-yellow-400 transition-colors"
                              >
                                CONFIRM
                              </button>
                              <button
                                onClick={() => setPendingTarget(null)}
                                className="flex-1 py-1 border border-yellow-500/30 text-[10px] hover:bg-yellow-500/10 transition-colors"
                              >
                                CANCEL
                              </button>
                            </div>
                          </div>
                        )}

                        {selectedAircraft.targetId && (
                          <button
                            onClick={() => launchMissile(selectedAircraft.id, selectedAircraft.targetId!)}
                            className="w-full py-2 bg-red-600/40 border border-red-500 text-white font-bold hover:bg-red-600/60 transition-colors flex items-center justify-center gap-2 animate-pulse"
                          >
                            <Target size={14} /> FOX THREE (FIRE)
                          </button>
                        )}

                        <div className="pt-2 border-t border-emerald-500/20">
                          <div className="text-[10px] opacity-60 mb-1">Tactical Actions</div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => toggleECM(selectedAircraft.id)}
                              className={cn(
                                "py-1 border text-[10px] font-bold transition-colors flex items-center justify-center gap-1",
                                selectedAircraft.ecmActive ? "bg-emerald-500 text-slate-900 border-emerald-500" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                              )}
                            >
                              ECM: {selectedAircraft.ecmActive ? 'ON' : 'OFF'}
                            </button>
                            <button
                              onClick={() => {
                                cancelTarget(selectedAircraft.id);
                                cancelMission(selectedAircraft.id);
                                if (group) {
                                  group.memberIds.forEach(id => {
                                    cancelTarget(id);
                                    cancelMission(id);
                                  });
                                }
                              }}
                              className="py-1 border border-emerald-500/30 text-[10px] hover:bg-emerald-500/10 transition-colors"
                            >
                              CANCEL ALL ORDERS
                            </button>
                            <select
                              value={landingBaseId || ''}
                              onChange={(e) => setLandingBaseId(e.target.value)}
                              className="py-1 bg-slate-800 border border-emerald-500/30 text-[9px] text-emerald-400 rounded"
                            >
                              {allBasesForScramble.map(base => (
                                <option key={base.id} value={base.id}>{base.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => landAircraft(selectedAircraft.id, landingBaseId || undefined)}
                              className="py-1 border border-emerald-500/30 text-[10px] hover:bg-emerald-500/10 transition-colors"
                            >
                              LAND
                            </button>
                            {selectedAircraft.status === AircraftStatus.HANGAR && (
                              <button
                                onClick={() => takeoff(selectedAircraft.id)}
                                className="py-1 border border-emerald-500/30 text-[10px] hover:bg-emerald-500/10 transition-colors"
                              >
                                TAKEOFF
                              </button>
                            )}
                            {/* Cargo reload for Transport aircraft */}
                            {selectedAircraft.spec.role === 'Transport' && selectedAircraft.status === AircraftStatus.HANGAR && (
                              selectedAircraft.cargoReloadTime && selectedAircraft.cargoReloadTime > 0 ? (
                                <div className="py-1 bg-amber-500/20 border border-amber-500/40 text-[10px] text-amber-400">
                                  RECARREGANDO... {Math.ceil(selectedAircraft.cargoReloadTime)}s
                                </div>
                              ) : !selectedAircraft.hasCargo ? (
                                <button
                                  onClick={() => reloadCargo(selectedAircraft.id)}
                                  className="py-1 bg-amber-500/20 border border-amber-500/40 text-[10px] text-amber-400 hover:bg-amber-500/30 transition-colors"
                                >
                                  RECARREGAR CARGA
                                </button>
                              ) : (
                                <div className="py-1 bg-emerald-500/20 border border-emerald-500/40 text-[10px] text-emerald-400">
                                  COM CARGA
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        {/* Group Management */}
                        <div className="pt-2 border-t border-emerald-500/20">
                          <div className="text-[10px] opacity-60 mb-1">Group Control</div>
                          {group ? (
                            <div className="space-y-2">
                              <div className="text-[10px] text-emerald-400 font-bold">
                                {group.name}
                              </div>
                              <button
                                onClick={() => disbandGroup(group.id)}
                                className="w-full py-1 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] hover:bg-red-500/20 transition-colors"
                              >
                                DISBAND GROUP
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[8px] opacity-40">Create group with available units</p>
                              <div className="grid grid-cols-3 gap-1">
                                {(['VIC', 'LINE', 'ECHELON'] as FormationType[]).map(type => (
                                  <button
                                    key={type}
                                    onClick={() => handleCreateGroup(type)}
                                    className="py-1 border border-emerald-500/30 text-[9px] hover:bg-emerald-500/10 transition-colors"
                                  >
                                    {type}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedAircraft.side === Side.HOSTILE && (
                      <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-[10px] text-red-400 italic">
                        <AlertTriangle size={12} className="inline mr-1" />
                        Select a friendly aircraft and click this target on the map to designate.
                      </div>
                    )}
                  </>
                )}

                {selectedGroundUnit && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-500/60">Unit Identification</span>
                      <span className={cn(
                        "font-bold px-2 py-0.5 rounded",
                        selectedGroundUnit.side === Side.FRIENDLY ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
                      )}>
                        {selectedGroundUnit.side}
                      </span>
                    </div>

                    <div className="text-lg font-bold text-emerald-400">{selectedGroundUnit.model}</div>
                    <div className="text-sm text-emerald-500/60">{selectedGroundUnit.type}</div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] opacity-60">Radar Range</div>
                        <div className="text-sm font-bold">{selectedGroundUnit.radarRangeKm} KM</div>
                      </div>
                      <div>
                        <div className="text-[10px] opacity-60">Status</div>
                        <div className="text-sm font-bold">{selectedGroundUnit.status}</div>
                      </div>
                    </div>

                    <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">
                      <div className="flex items-center gap-2 text-emerald-500/60 mb-2">
                        <Target size={12} />
                        <span className="text-[10px]">Missile Inventory</span>
                      </div>
                       <div className="space-y-1">
                         {selectedGroundUnit.missiles && Object.entries(selectedGroundUnit.missiles).map(([missileType, count]) => (
                           <div key={missileType} className="flex justify-between">
                             <span className="text-[10px] opacity-60">{missileType}</span>
                             <span className="text-[10px] font-bold">{count}</span>
                           </div>
                         ))}
                         {!selectedGroundUnit.missiles && (
                           <div className="text-[10px] opacity-40 italic">No missiles</div>
                         )}
                       </div>
                    </div>

                    <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] opacity-60">Health</span>
                        <span className="text-[10px] font-bold">{selectedGroundUnit.health}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all",
                            selectedGroundUnit.health > 50 ? "bg-emerald-500" : selectedGroundUnit.health > 25 ? "bg-yellow-500" : "bg-red-500"
                          )}
                          style={{ width: `${selectedGroundUnit.health}%` }}
                        />
                      </div>
                    </div>

                    {selectedGroundUnit.lastLaunchTime && (
                      <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                        <div className="flex items-center gap-2 text-yellow-500/60">
                          <Clock size={12} />
                          <span className="text-[10px]">Reload Status</span>
                        </div>
                        <div className="text-[10px] mt-1">
                          {Math.max(0, 5 - (Date.now() - selectedGroundUnit.lastLaunchTime) / 1000).toFixed(1)}s remaining
                        </div>
                      </div>
                    )}

                    {selectedGroundUnit.side === Side.FRIENDLY && selectedGroundUnit.status !== "DESTROYED" && (
                      <div className="space-y-2 pt-2 border-t border-emerald-500/20">
                        <div className="text-[10px] opacity-60 mb-1">Tactical Actions</div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setGroundUnitTarget(selectedGroundUnit.id, friendlyBase.position)}
                            className="py-1 border border-emerald-500/30 text-[10px] hover:bg-emerald-500/10 transition-colors"
                          >
                            RETURN TO BASE
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom - Logs */}
      <div className="w-full max-w-2xl mx-auto pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 rounded-lg mt-4 overflow-hidden shrink-0 shadow-2xl shadow-black/50">
        <div className="bg-emerald-500/10 p-1 px-3 border-b border-emerald-500/30 flex items-center gap-2 text-[10px]">
          <Terminal size={10} /> Brevity Log
        </div>
        <div className="h-20 md:h-24 overflow-y-auto p-2 space-y-1 text-[10px] custom-scrollbar">
          {logs.map((log, i) => (
            <div key={i} className={cn(
              "flex gap-2",
              i === 0 ? "text-emerald-300 font-bold" : "opacity-60"
            )}>
              <ChevronRight size={10} className="mt-0.5 shrink-0" />
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
