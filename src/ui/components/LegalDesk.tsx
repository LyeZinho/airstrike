import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { calculateContestationOdds } from '../../utils/legalSystem';

interface LegalDeskProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const INFLUENCE_COST_PER_POINT = 2000;
const MAX_LEGAL_INFLUENCE = 20;

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: 'bg-yellow-900', text: 'text-yellow-300', label: '⚖️ Pending' },
  CONTESTED: { bg: 'bg-blue-900', text: 'text-blue-300', label: '📋 Contested' },
  PAID: { bg: 'bg-green-900', text: 'text-green-300', label: '✅ Paid' },
  WON: { bg: 'bg-green-800', text: 'text-green-200', label: '🏆 Won' },
  LOST: { bg: 'bg-red-900', text: 'text-red-300', label: '❌ Lost' },
  IGNORED: { bg: 'bg-red-950', text: 'text-red-400', label: '🖕 Ignored' },
};

const getTimeRemaining = (deadline: number): { formatted: string; percentage: number; isUrgent: boolean } => {
  const now = Date.now();
  const remaining = deadline - now;
  const total = 48 * 60 * 60 * 1000;
  const percentage = Math.max(0, (remaining / total) * 100);
  const isUrgent = percentage < 10;
  const hours = Math.max(0, Math.floor(remaining / (60 * 60 * 1000)));
  const minutes = Math.max(0, Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000)));
  return { formatted: `${hours}h ${minutes}m`, percentage, isUrgent };
};

export const LegalDesk: React.FC<LegalDeskProps> = ({ isOpen, onClose }) => {
  const { lawsuits, casusBelli, legalInfluence, base, updateLawsuit, increaseLegalInfluence } =
    usePlayerStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeOnly = lawsuits.filter((l) => l.status === 'PENDING' || l.status === 'CONTESTED');

  const handlePay = (id: string) => updateLawsuit(id, { status: 'PAID' });
  const handleContest = (id: string) => updateLawsuit(id, { status: 'CONTESTED', lastAction: 'CONTEST' });
  const handleIgnore = (id: string) => updateLawsuit(id, { status: 'IGNORED', lastAction: 'IGNORE' });

  const inner = (
    <div className="w-full h-full bg-black/80 border border-green-900 rounded-lg p-4 flex flex-col">
      <div className="border-b border-green-900 pb-3 mb-4">
        <h2 className="text-green-400 font-mono text-lg font-bold">⚖️ TRIBUNAL DE ESTRATOSFERA</h2>
        <p className="text-green-700 text-xs font-mono mt-1">Active Legal Proceedings</p>
      </div>

      {activeOnly.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-green-600 font-mono text-sm">No active proceedings. System clear.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
          {activeOnly.map((lawsuit, idx) => {
            const { formatted, percentage, isUrgent } = getTimeRemaining(lawsuit.deadlineAt);
            const badge = STATUS_BADGES[lawsuit.status] || STATUS_BADGES.PENDING;
            const winChance = Math.round(calculateContestationOdds(lawsuit, legalInfluence) * 100);

            return (
              <motion.div
                key={lawsuit.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`border rounded p-3 ${
                  isUrgent
                    ? 'border-red-600 bg-red-950/20 animate-pulse'
                    : 'border-green-700 bg-green-950/30'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-green-500">{lawsuit.id.slice(0, 8)}</span>
                      <span className="text-green-300 font-mono text-sm">{lawsuit.claimantFactionId}</span>
                    </div>
                    <p className="text-green-400 text-xs font-mono">
                      Claim: {lawsuit.claimAmount.toLocaleString()} Cr
                    </p>
                  </div>
                  <div className={`${badge.bg} ${badge.text} px-2 py-1 rounded text-xs font-mono font-bold`}>
                    {badge.label}
                  </div>
                </div>

                <div className="bg-black/50 rounded p-2 mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-green-600 text-xs font-mono">Deadline</span>
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
                  <div>
                    Evidence: Vector {lawsuit.evidence.vectorOfAttack ? '✓' : '✗'} | Terrain{' '}
                    {lawsuit.evidence.terrainMismatch ? '✓' : '✗'} | Satellite{' '}
                    {lawsuit.evidence.satelliteImagery ? '✓' : '✗'}
                  </div>
                  <div>Jury Bias: {Math.round(lawsuit.juryBias * 100)}%</div>
                </div>

                {expandedId === lawsuit.id && lawsuit.status === 'PENDING' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-black/70 border-t border-green-700 pt-2 mb-2 space-y-2"
                  >
                    <div className="text-xs text-green-500 font-mono">📋 EVIDENCE ANALYSIS</div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono text-green-600">
                      <div className={lawsuit.evidence.vectorOfAttack ? 'text-green-400' : 'text-red-500'}>
                        {lawsuit.evidence.vectorOfAttack ? '✓' : '✗'} Attack Vector
                      </div>
                      <div className={lawsuit.evidence.terrainMismatch ? 'text-green-400' : 'text-red-500'}>
                        {lawsuit.evidence.terrainMismatch ? '✓' : '✗'} Terrain Mismatch
                      </div>
                      <div className={lawsuit.evidence.satelliteImagery ? 'text-green-400' : 'text-red-500'}>
                        {lawsuit.evidence.satelliteImagery ? '✓' : '✗'} Satellite
                      </div>
                      <div className="text-green-600">
                        Witnesses: {Math.round(lawsuit.evidence.witnessReports)}%
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded p-1.5 space-y-2">
                      <div>
                        <div className="text-xs text-green-500 mb-1">Win Probability:</div>
                        <div className="text-lg font-mono text-green-400">{winChance}%</div>
                      </div>

                      <div className="border-t border-slate-700 pt-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-green-500">Political Influence:</span>
                          <span className="text-xs font-mono text-green-400">
                            {legalInfluence}/{MAX_LEGAL_INFLUENCE}
                          </span>
                        </div>
                        <div className="w-full bg-gray-900 rounded-full h-1.5 mb-1">
                          <div
                            className="h-full bg-green-600 rounded-full transition-all"
                            style={{ width: `${(legalInfluence / MAX_LEGAL_INFLUENCE) * 100}%` }}
                          />
                        </div>
                        <button
                          onClick={() => increaseLegalInfluence(INFLUENCE_COST_PER_POINT)}
                          disabled={
                            base.credits < INFLUENCE_COST_PER_POINT ||
                            legalInfluence >= MAX_LEGAL_INFLUENCE
                          }
                          className="w-full text-xs py-1 rounded px-1 font-mono transition bg-purple-900 hover:bg-purple-800 disabled:bg-gray-700 disabled:text-gray-600 text-purple-300"
                        >
                          Buy Influence ({INFLUENCE_COST_PER_POINT} Cr)
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-2">
                  {lawsuit.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handlePay(lawsuit.id)}
                        className="flex-1 bg-green-900 hover:bg-green-800 text-green-300 text-xs py-1 rounded px-2 font-mono transition"
                      >
                        Pay
                      </button>
                      <button
                        onClick={() => setExpandedId(expandedId === lawsuit.id ? null : lawsuit.id)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1 rounded px-2 font-mono transition"
                      >
                        {expandedId === lawsuit.id ? 'Close' : 'Evidence'}
                      </button>
                      {expandedId === lawsuit.id && (
                        <button
                          onClick={() => handleContest(lawsuit.id)}
                          className="flex-1 bg-blue-900 hover:bg-blue-800 text-blue-300 text-xs py-1 rounded px-2 font-mono transition"
                        >
                          Contest
                        </button>
                      )}
                      <button
                        onClick={() => handleIgnore(lawsuit.id)}
                        className="flex-1 bg-red-950 hover:bg-red-900 text-red-400 text-xs py-1 rounded px-2 font-mono transition"
                      >
                        Ignore
                      </button>
                    </>
                  )}
                  {lawsuit.status === 'CONTESTED' && (
                    <div className="flex-1 bg-blue-950 text-blue-300 text-xs py-1 rounded px-2 font-mono text-center">
                      Awaiting Verdict...
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
          <div className="text-red-500 font-mono text-sm font-bold mb-2">⚔️ CASUS BELLI DECLARED</div>
          <div className="space-y-1.5">
            {casusBelli.map((cb, idx) => {
              const now = Date.now();
              const timeRemaining = Math.max(0, cb.expiresAt - now);
              const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border border-red-900 bg-red-950/40 rounded p-2 text-xs font-mono"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-red-300">{cb.factionId}</span>
                    <span className="text-red-600 text-xs">Hostility: {cb.hostilityLevel}%</span>
                  </div>
                  <div className="text-red-700">
                    Reason: {cb.reason === 'LAWSUIT_IGNORED' ? 'Lawsuit Ignored' : cb.reason}
                  </div>
                  <div className="text-red-600 text-xs">Expires in: {daysRemaining}d</div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="border-t border-green-900 mt-4 pt-3">
        <div className="grid grid-cols-2 gap-2 text-xs font-mono text-green-600">
          <div>Active: {activeOnly.length}</div>
          <div>Contested: {lawsuits.filter((l) => l.status === 'CONTESTED').length}</div>
        </div>
      </div>
    </div>
  );

  if (isOpen !== undefined) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[5000] pointer-events-auto"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-[600px] max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {onClose && (
                <button
                  onClick={onClose}
                  className="absolute top-2 right-2 z-10 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              )}
              {inner}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return inner;
};
