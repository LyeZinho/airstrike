import React from 'react';
import { FactionRelationship } from '../../types/geopolitics';
import { Shield, AlertTriangle, Handshake, Info, Activity } from 'lucide-react';
import { motion } from 'motion/react';

interface DiplomacyMatrixProps {
  relationships: FactionRelationship[];
  factions: Map<string, { name: string }>;
}

export const DiplomacyMatrix: React.FC<DiplomacyMatrixProps> = ({ relationships, factions }) => {
  const getTrustLevel = (trust: number): { label: string; color: string } => {
    if (trust > 75) return { label: 'HIGH', color: 'text-emerald-400' };
    if (trust > 50) return { label: 'MED', color: 'text-emerald-500/60' };
    if (trust > 25) return { label: 'LOW', color: 'text-amber-500/60' };
    return { label: 'CRIT', color: 'text-red-500' };
  };

  const getRelationshipStatus = (relationship: FactionRelationship): { label: string; bg: string; text: string } => {
    const trust = relationship.trust || 0;
    const fear = relationship.fear || 0;
    const alignment = relationship.alignment || 0;
    const quality = trust - fear + alignment * 0.5;
    if (quality > 50) return { label: 'ALLIED', bg: 'bg-emerald-500/10', text: 'text-emerald-500' };
    if (quality > 0) return { label: 'NEUTRAL', bg: 'bg-slate-500/10', text: 'text-slate-400' };
    if (quality > -50) return { label: 'TENSE', bg: 'bg-amber-500/10', text: 'text-amber-500' };
    return { label: 'HOSTILE', bg: 'bg-red-500/10', text: 'text-red-500' };
  };

  const uniqueRelationships = relationships ? relationships.filter((rel, idx, arr) =>
    arr.findIndex(
      (r) =>
        r.factionAId === rel.factionBId &&
        r.factionBId === rel.factionAId &&
        r.factionAId > r.factionBId
    ) === idx
  ) : [];

  return (
    <div className="flex-1 w-full h-full">
      <div className="space-y-4">
        {uniqueRelationships.length === 0 && (
          <div className="text-[10px] text-slate-500/30 text-center py-6 italic tracking-[0.2em] uppercase">Geopolitical channels silent...</div>
        )}
        {uniqueRelationships.map((rel, idx) => {
          const factionAName = factions?.get?.(rel.factionAId)?.name || rel.factionAId;
          const factionBName = factions?.get?.(rel.factionBId)?.name || rel.factionBId;
          const status = getRelationshipStatus(rel);
          const trust = getTrustLevel(rel.trust || 0);

          return (
            <motion.div 
              key={`rel-${rel.factionAId}-${rel.factionBId}-${idx}`} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/60 border border-white/5 rounded p-3 hover:bg-emerald-500/5 transition-all"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-white">{factionAName?.split('_')[0]}</span>
                  <Activity size={10} className="text-slate-700" />
                  <span className="text-[9px] font-black text-slate-400">{factionBName?.split('_')[0]}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-sm text-[8px] font-black tracking-[0.2em] border border-white/5 shadow-sm ${status.bg} ${status.text}`}>
                  {status.label}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-3">
                 <div className="flex flex-col">
                   <span className="text-[6px] text-slate-600 font-black mb-1 tracking-widest uppercase">TRUST</span>
                   <span className={`text-[10px] font-bold ${trust.color}`}>{rel.trust || 0}%</span>
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[6px] text-slate-600 font-black mb-1 tracking-widest uppercase">FEAR</span>
                   <span className="text-[10px] font-bold text-red-500/80">{rel.fear || 0}%</span>
                 </div>
                 <div className="flex flex-col border-l border-white/5 pl-4">
                   <span className="text-[6px] text-slate-600 font-black mb-1 tracking-widest uppercase">ALIGN</span>
                   <span className="text-[10px] font-bold text-slate-300">{rel.alignment || 0}%</span>
                 </div>
              </div>

              {/* Status Bar */}
              <div className="h-0.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${status.text.replace('text-', 'bg-')} opacity-60`} style={{ width: `${rel.trust || 0}%` }} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
