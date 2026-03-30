import React from 'react';
import { FactionRelationship } from '../../types/geopolitics';
import { Shield, AlertTriangle, Handshake } from 'lucide-react';

interface DiplomacyMatrixProps {
  relationships: FactionRelationship[];
  factions: Map<string, { name: string }>;
}

export const DiplomacyMatrix: React.FC<DiplomacyMatrixProps> = ({ relationships, factions }) => {
  const getTrustColor = (trust: number): string => {
    if (trust > 75) return 'bg-green-900';
    if (trust > 50) return 'bg-green-800';
    if (trust > 25) return 'bg-yellow-800';
    return 'bg-red-800';
  };

  const getRelationshipStatus = (relationship: FactionRelationship): string => {
    const quality = relationship.trust - relationship.fear + relationship.alignment * 0.5;
    if (quality > 50) return 'ALLIED';
    if (quality > 0) return 'NEUTRAL';
    if (quality > -50) return 'TENSE';
    return 'HOSTILE';
  };

  const uniqueRelationships = relationships.filter((rel, idx, arr) =>
    arr.findIndex(
      (r) =>
        r.factionAId === rel.factionBId &&
        r.factionBId === rel.factionAId &&
        r.factionAId > r.factionBId
    ) === idx
  );

  return (
    <div className="flex-1 w-full h-full">
      <div className="overflow-x-auto h-full">
        <table className="w-full text-[10px] tracking-wider font-mono">
          <thead>
            <tr className="border-b border-cyan-500/30">
              <th className="text-left p-2 text-cyan-600/70 uppercase">From</th>
              <th className="text-left p-2 text-cyan-600/70 uppercase">To</th>
              <th className="text-center p-2 text-cyan-600/70 uppercase">Trust</th>
              <th className="text-center p-2 text-cyan-600/70 uppercase">Fear</th>
              <th className="text-center p-2 text-cyan-600/70 uppercase">Align</th>
              <th className="text-left p-2 text-cyan-600/70 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {uniqueRelationships.map((rel) => {
              const factionAName = factions.get(rel.factionAId)?.name || rel.factionAId;
              const factionBName = factions.get(rel.factionBId)?.name || rel.factionBId;
              const status = getRelationshipStatus(rel);

              return (
                <tr key={`${rel.factionAId}-${rel.factionBId}`} className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors">
                  <td className="p-2 text-cyan-300">{factionAName}</td>
                  <td className="p-2 text-cyan-300">{factionBName}</td>
                  <td className={`text-center p-2 font-black ${getTrustColor(rel.trust)}`}>{rel.trust}</td>
                  <td className="text-center p-2 text-red-400 bg-red-900/20">{rel.fear}</td>
                  <td className="text-center p-2 text-blue-400 bg-blue-900/20">{rel.alignment}</td>
                  <td className="p-2">
                    <span className="px-1.5 py-0.5 bg-slate-800/80 rounded border border-slate-700 text-[9px] text-gray-300 shadow-[0_0_5px_rgba(0,0,0,0.5)]">{status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
