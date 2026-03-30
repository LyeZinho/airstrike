import React from 'react';
import { PassiveObjective } from '../../types/geopolitics';
import { Target, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface ObjectivesTrackerProps {
  objectives: PassiveObjective[];
  onObjectiveClick?: (objective: PassiveObjective) => void;
}

export const ObjectivesTracker: React.FC<ObjectivesTrackerProps> = ({
  objectives,
  onObjectiveClick,
}) => {
  const getStatusIcon = (status: PassiveObjective['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'FAILED':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Target className="w-4 h-4 text-gray-400" />;
    }
  };

  const activeObjectives = objectives.filter((obj) => obj.status === 'ACTIVE');

  return (
    <div className="flex-1 w-full h-full">
      <div className="space-y-2 h-full">
        {objectives.map((obj) => (
          <div
            key={obj.id}
            className="border border-slate-700/50 bg-slate-900/50 rounded p-2 hover:border-cyan-500/50 hover:bg-slate-800/80 cursor-pointer transition-all shadow-[0_0_10px_rgba(0,0,0,0.2)] group"
            onClick={() => onObjectiveClick?.(obj)}
          >
            <div className="flex items-center justify-between mb-2 border-b border-slate-700/50 pb-1">
              <div className="flex items-center gap-2">
                <div className="group-hover:animate-pulse">{getStatusIcon(obj.status)}</div>
                <span className="text-[10px] font-bold tracking-widest text-cyan-100 uppercase">{obj.type}</span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border ${obj.status === 'ACTIVE' ? 'bg-yellow-900/20 text-yellow-500 border-yellow-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{obj.status}</span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 bg-slate-800 rounded-sm h-1.5 overflow-hidden border border-slate-700">
                <div
                  className="bg-cyan-500 h-full transition-all shadow-[0_0_5px_rgba(6,182,212,0.8)]"
                  style={{ width: `${obj.progress}%` }}
                />
              </div>
              <span className="text-[9px] text-cyan-400 font-bold">{Math.round(obj.progress)}%</span>
            </div>

            <div className="flex justify-between text-[9px] text-slate-400 uppercase tracking-wider">
              <span>+<span className="text-emerald-400">{obj.revenuePerTick}</span> cr/t</span>
              <span>Assets: <span className="text-cyan-300">{obj.assignedAircraft.length}</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
