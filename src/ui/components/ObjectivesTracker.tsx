import React from 'react';
import { PassiveObjective } from '../../types/geopolitics';
import { Target, CheckCircle, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

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
        return <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />;
      case 'COMPLETED':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
      case 'FAILED':
        return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
      default:
        return <Target className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="flex-1 w-full h-full">
      <div className="space-y-2">
        {(!objectives || objectives.length === 0) && (
          <div className="text-[10px] text-slate-500/40 text-center py-6 italic tracking-[0.2em] uppercase">No mission data linked</div>
        )}
        {objectives && objectives.map((obj, idx) => (
          <motion.div
            key={`obj-${obj.id || 'none'}-${idx}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="group relative bg-[#0a0a1a]/40 border border-white/5 rounded p-3 hover:border-emerald-500/20 hover:bg-emerald-500/5 cursor-pointer transition-all overflow-hidden"
            onClick={() => onObjectiveClick?.(obj)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(obj.status)}
                <span className="text-[8px] font-black tracking-[0.2em] text-white/50 uppercase">
                  {obj.type || 'PROTOCOL'}
                </span>
              </div>
              <span className={`text-[7px] px-1.5 py-0.5 rounded-sm border font-black uppercase tracking-widest ${
                obj.status === 'ACTIVE' 
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                  : obj.status === 'COMPLETED' 
                    ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' 
                    : 'bg-slate-800/40 text-slate-500 border-white/5'
              }`}>
                {obj.status || 'READY'}
              </span>
            </div>

            {/* Progress Visualization */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-widest text-slate-500">
                <span>PROGRESS</span>
                <span className="text-emerald-400">{Math.round(obj.progress || 0)}%</span>
              </div>
              <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(0, obj.progress || 0))}%` }}
                  className="h-full bg-emerald-500 relative"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-between items-center bg-black/30 p-1.5 rounded border border-white/5">
              <div className="flex flex-col">
                <span className="text-[6px] text-emerald-600/40 font-black tracking-widest uppercase">REV_YIELD</span>
                <span className="text-[9px] font-bold text-emerald-400">+{obj.revenuePerTick || 0}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[6px] text-slate-600 font-black tracking-widest uppercase">ASSET_ALLOC</span>
                <span className="text-[9px] font-bold text-slate-300">{obj.assignedAircraft?.length || 0}U</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
