import React from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useGameUI } from '../../store/useGameUI';
import { BuildingType } from '../../types/entities';

interface BuildMenuProps {
  onClose: () => void;
}

export const BuildMenu: React.FC<BuildMenuProps> = ({ onClose }) => {
  const { base, upgradeInner, expandOuter } = usePlayerStore();
  const { setBuildMode, setSelectedBuildingType } = useGameUI();

  const innerUpgrades = [
    { name: 'HANGAR', cost: 15000 },
    { name: 'RADAR UPGRADE', cost: 10000 },
    { name: 'FUEL DEPOT', cost: 8000 },
    { name: 'SAM DEFENSE', cost: 20000 },
  ];

  const buildingTypes: BuildingType[] = [
    BuildingType.HANGAR,
    BuildingType.FUEL_DEPOT,
    BuildingType.RADAR,
    BuildingType.SAM_BATTERY,
    BuildingType.RUNWAY,
    BuildingType.REFINERY,
    BuildingType.SUPPLY_DEPOT,
    BuildingType.INFRASTRUCTURE,
  ];

  const handlePlaceBuilding = (type: BuildingType) => {
    setBuildMode(true);
    setSelectedBuildingType(type);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-xl w-[500px] p-6 font-mono text-emerald-400">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold tracking-wider">BUILD MENU</h2>
          <button
            onClick={onClose}
            className="border border-red-700/50 bg-red-900/20 hover:bg-red-700/30 text-red-400 px-3 py-1 text-xs font-mono"
          >
            CLOSE
          </button>
        </div>

        {/* Inner Upgrades Section */}
        <div className="mb-6">
          <h3 className="text-sm font-bold mb-3 text-emerald-300">INNER UPGRADES</h3>
          <div className="grid grid-cols-2 gap-2">
            {innerUpgrades.map((upgrade) => (
              <button
                key={upgrade.name}
                onClick={() => upgradeInner()}
                disabled={base.credits < upgrade.cost}
                className="border border-emerald-700/50 bg-emerald-900/20 hover:bg-emerald-700/30 text-emerald-400 px-3 py-2 text-xs font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-bold">{upgrade.name}</div>
                <div className="text-[10px] text-emerald-500/60">${upgrade.cost.toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Territory Expansion Section */}
        <div className="mb-6">
          <h3 className="text-sm font-bold mb-3 text-emerald-300">TERRITORY EXPANSION</h3>
          <button
            onClick={() => expandOuter()}
            disabled={base.credits < 10000}
            className="w-full border border-emerald-700/50 bg-emerald-900/20 hover:bg-emerald-700/30 text-emerald-400 px-3 py-2 text-xs font-mono disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="font-bold">EXPAND TERRITORY (+20km)</div>
            <div className="text-[10px] text-emerald-500/60">$10,000</div>
          </button>
        </div>

        {/* Place Structure Section */}
        <div>
          <h3 className="text-sm font-bold mb-3 text-emerald-300">PLACE STRUCTURE</h3>
          <div className="grid grid-cols-3 gap-2">
            {buildingTypes.map((type) => (
              <button
                key={type}
                onClick={() => handlePlaceBuilding(type)}
                className="border border-emerald-700/50 bg-emerald-900/20 hover:bg-emerald-700/30 text-emerald-400 px-3 py-2 text-xs font-mono"
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
