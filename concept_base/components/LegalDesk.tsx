import { motion } from 'motion/react';
import { useGameStore } from '../store/useGameStore';
import { FACTION_SPECS_PHASE16 } from '../data/factionData';
import { getEvidenceReliability, calculateContestationOdds } from '../utils/legalSystem';
import { useState } from 'react';

const INFLUENCE_COST_PER_POINT = 2000;
const MAX_LEGAL_INFLUENCE = 20;

export function LegalDesk() {
  const lawsuits = useGameStore(state => state.lawsuits);
  const casusBelli = useGameStore(state => state.casusBelli);
  const friendlyBase = useGameStore(state => state.friendlyBase);
  const legalInfluence = useGameStore(state => state.legalInfluence);
  const payoutLawsuit = useGameStore(state => state.payoutLawsuit);
  const contestLawsuit = useGameStore(state => state.contestLawsuit);
  const ignoreLawsuit = useGameStore(state => state.ignoreLawsuit);
  const increaseLegalInfluence = useGameStore(state => state.increaseLegalInfluence);
  const [expandedLawsuitId, setExpandedLawsuitId] = useState<string | null>(null);

  const activeOnly = lawsuits.filter(l => l.status === 'PENDING' || l.status === 'CONTESTED');

  const getTimeRemaining = (deadline: number): { formatted: string; percentage: number; isUrgent: boolean } => {
    const now = Date.now();
    const remaining = deadline - now;
    const total = 48 * 60 * 60 * 1000;
    const percentage = Math.max(0, (remaining / total) * 100);
    const isUrgent = percentage < 10;
    
    const hours = Math.max(0, Math.floor(remaining / (60 * 60 * 1000)));
    const minutes = Math.max(0, Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000)));
    
    return { 
      formatted: `${hours}h ${minutes}m`, 
      percentage,
      isUrgent 
    };
  };

  const getFactionColor = (factionId: string): string => {
    const spec = FACTION_SPECS_PHASE16[factionId];
    return spec?.color || '#888888';
  };

  const getFactionName = (factionId: string): string => {
    const spec = FACTION_SPECS_PHASE16[factionId];
    return spec?.name || factionId;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      PENDING: { bg: 'bg-yellow-900', text: 'text-yellow-300', label: '⚖️ Em Julgamento' },
      CONTESTED: { bg: 'bg-blue-900', text: 'text-blue-300', label: '📋 Contestado' },
      PAID: { bg: 'bg-green-900', text: 'text-green-300', label: '✅ Pago' },
      WON: { bg: 'bg-green-800', text: 'text-green-200', label: '🏆 Ganho' },
      LOST: { bg: 'bg-red-900', text: 'text-red-300', label: '❌ Perdido' },
      IGNORED: { bg: 'bg-red-950', text: 'text-red-400', label: '🖕 Ignorado' },
    };
    const badge = badges[status] || badges.PENDING;
    return badge;
  };

  return (
    <div className="w-full h-full bg-black bg-opacity-80 border border-green-900 rounded-lg p-4 flex flex-col">
      <div className="border-b border-green-900 pb-3 mb-4">
        <h2 className="text-green-400 font-mono text-lg font-bold">⚖️ TRIBUNAL DE ESTRATOSFERA</h2>
        <p className="text-green-700 text-xs font-mono mt-1">Processos Legais Ativos</p>
      </div>

      {activeOnly.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-green-600 font-mono text-sm">Nenhum processo ativo. Sistema limpo.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2">
          {activeOnly.map((lawsuit, idx) => {
            const { formatted, percentage, isUrgent } = getTimeRemaining(lawsuit.deadlineAt);
            const badge = getStatusBadge(lawsuit.status);
            const claimantName = getFactionName(lawsuit.claimantFactionId);
            const factionColor = getFactionColor(lawsuit.claimantFactionId);

            return (
              <motion.div
                key={lawsuit.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`border rounded p-3 ${isUrgent ? 'border-red-600 bg-red-950 bg-opacity-20 animate-pulse' : 'border-green-700 bg-green-950 bg-opacity-30'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-green-500">{lawsuit.id.slice(0, 8)}</span>
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: factionColor }}
                      ></span>
                      <span className="text-green-300 font-mono text-sm">{claimantName}</span>
                    </div>
                    <p className="text-green-400 text-xs font-mono">Valor: {lawsuit.claimAmount.toLocaleString()}Cr</p>
                  </div>
                  <div className={`${badge.bg} ${badge.text} px-2 py-1 rounded text-xs font-mono font-bold`}>
                    {badge.label}
                  </div>
                </div>

                <div className="bg-black bg-opacity-50 rounded p-2 mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-green-600 text-xs font-mono">Prazo</span>
                    <span className={`text-xs font-mono ${isUrgent ? 'text-red-400 font-bold' : 'text-green-400'}`}>
                      {formatted}
                    </span>
                  </div>
                  <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className={`h-full ${isUrgent ? 'bg-red-600' : 'bg-green-600'}`}
                      initial={{ width: '100%' }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                <div className="text-xs text-green-700 font-mono space-y-0.5 mb-2">
                  <div>Evidência: Vetor {lawsuit.evidence.vectorOfAttack ? '✓' : '✗'} | Terreno {lawsuit.evidence.terrainMismatch ? '✓' : '✗'} | Satélite {lawsuit.evidence.satelliteImagery ? '✓' : '✗'}</div>
                  <div>Viés do Júri: {Math.round(lawsuit.juryBias * 100)}%</div>
                </div>

                {expandedLawsuitId === lawsuit.id && lawsuit.status === 'PENDING' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-black bg-opacity-70 border-t border-green-700 pt-2 mb-2 space-y-2"
                  >
                    <div className="text-xs text-green-500 font-mono">📋 ANÁLISE DE EVIDÊNCIAS</div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono text-green-600">
                      <div className={lawsuit.evidence.vectorOfAttack ? 'text-green-400' : 'text-red-500'}>
                        {lawsuit.evidence.vectorOfAttack ? '✓' : '✗'} Vetor de Ataque
                      </div>
                      <div className={lawsuit.evidence.terrainMismatch ? 'text-green-400' : 'text-red-500'}>
                        {lawsuit.evidence.terrainMismatch ? '✓' : '✗'} Terreno Incorreto
                      </div>
                      <div className={lawsuit.evidence.satelliteImagery ? 'text-green-400' : 'text-red-500'}>
                        {lawsuit.evidence.satelliteImagery ? '✓' : '✗'} Satélite
                      </div>
                      <div className="text-green-600">
                        Testemunhas: {Math.round(lawsuit.evidence.witnessReports)}%
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded p-1.5 space-y-2">
                      <div>
                        <div className="text-xs text-green-500 mb-1">Chance de Vitória:</div>
                        <div className="text-lg font-mono text-green-400">{Math.round(calculateContestationOdds(lawsuit, legalInfluence) * 100)}%</div>
                      </div>

                      <div className="border-t border-slate-700 pt-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-green-500">Influência Política:</span>
                          <span className="text-xs font-mono text-green-400">{legalInfluence}/{MAX_LEGAL_INFLUENCE}</span>
                        </div>
                        <div className="w-full bg-gray-900 rounded-full h-1.5 mb-1">
                          <div
                            className="h-full bg-green-600 rounded-full transition-all"
                            style={{ width: `${(legalInfluence / MAX_LEGAL_INFLUENCE) * 100}%` }}
                          />
                        </div>
                        <button
                          onClick={() => increaseLegalInfluence(1)}
                          disabled={friendlyBase.credits < INFLUENCE_COST_PER_POINT || legalInfluence >= MAX_LEGAL_INFLUENCE}
                          className="w-full text-xs py-1 rounded px-1 font-mono transition bg-purple-900 hover:bg-purple-800 disabled:bg-gray-700 disabled:text-gray-600 text-purple-300"
                          title={`Custo: ${INFLUENCE_COST_PER_POINT}Cr por ponto`}
                        >
                          Aumentar Influência ({INFLUENCE_COST_PER_POINT}Cr)
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-2">
                  {lawsuit.status === 'PENDING' && (
                    <>
                      <button 
                        onClick={() => payoutLawsuit(lawsuit.id)}
                        className="flex-1 bg-green-900 hover:bg-green-800 text-green-300 text-xs py-1 rounded px-2 font-mono transition">
                        Pagar
                      </button>
                      <button 
                        onClick={() => setExpandedLawsuitId(expandedLawsuitId === lawsuit.id ? null : lawsuit.id)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1 rounded px-2 font-mono transition">
                        {expandedLawsuitId === lawsuit.id ? 'Fechar' : 'Evidências'}
                      </button>
                      {expandedLawsuitId === lawsuit.id && (
                        <button 
                          onClick={() => contestLawsuit(lawsuit.id)}
                          className="flex-1 bg-blue-900 hover:bg-blue-800 text-blue-300 text-xs py-1 rounded px-2 font-mono transition">
                          Contestar
                        </button>
                      )}
                      <button 
                        onClick={() => ignoreLawsuit(lawsuit.id)}
                        className="flex-1 bg-red-950 hover:bg-red-900 text-red-400 text-xs py-1 rounded px-2 font-mono transition">
                        Ignorar
                      </button>
                    </>
                  )}
                  {lawsuit.status === 'CONTESTED' && (
                    <div className="flex-1 bg-blue-950 text-blue-300 text-xs py-1 rounded px-2 font-mono text-center">
                      Aguardando Veredicto...
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {casusBelli.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-t border-red-900 mt-4 pt-3 space-y-2"
        >
          <div className="text-red-500 font-mono text-sm font-bold mb-2">⚔️ CASUS BELLI DECLARADO</div>
          <div className="space-y-1.5">
            {casusBelli.map((cb, idx) => {
              const factionName = getFactionName(cb.factionId);
              const factionColor = getFactionColor(cb.factionId);
              const now = Date.now();
              const timeRemaining = Math.max(0, cb.expiresAt - now);
              const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
              
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border border-red-900 bg-red-950 bg-opacity-40 rounded p-2 text-xs font-mono"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: factionColor }}
                    ></span>
                    <span className="text-red-300">{factionName}</span>
                    <span className="text-red-600 text-xs">Hostilidade: {cb.hostilityLevel}%</span>
                  </div>
                  <div className="text-red-700">Motivo: {cb.reason === 'LAWSUIT_IGNORED' ? 'Processo Ignorado' : cb.reason}</div>
                  <div className="text-red-600 text-xs">Válido por: {daysRemaining}d</div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="border-t border-green-900 mt-4 pt-3">
        <div className="grid grid-cols-2 gap-2 text-xs font-mono text-green-600">
          <div>Processos: {activeOnly.length}</div>
          <div>Em Análise: {lawsuits.filter(l => l.status === 'CONTESTED').length}</div>
        </div>
      </div>
    </div>
  );
}
