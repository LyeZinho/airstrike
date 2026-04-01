import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, ChevronRight, X } from 'lucide-react';

interface WelcomeTerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LOREBOOK = [
  {
    title: 'OPERATION: PURGATÓRIO DE RADAR',
    subtitle: 'Phase 16 - STRATOSFEAR Expansion',
    content:
      'The Cold War never ended. It evolved. In the vacuum left by old superpowers, 15 geopolitical factions now compete for air superiority, resources, and influence. You command a regional air force. Survive. Dominate. Control the skies.',
  },
  {
    title: 'THE 15 FACTIONS',
    subtitle: 'A New World Order',
    content:
      'European Coalition (EC), Baltic Naval Strike (BNS), Pan-African Alliance (PAN), Latin American Bloc (LA), Sino-Pacific (SP), Central European (CE), Arabian Defense (AD), United Asian Theater (UAT), Mediterranean Venture (MV), Caucasus Group (CG), Zebu Strategic (ZS), Himalayan Mandate (HM), Indian Frontier (IF), Caribbean Syndicate (CS), Atlantic Vanguard (AV).',
  },
  {
    title: 'THE STOCK MARKET',
    subtitle: 'War is Economics',
    content:
      'Every aircraft destroyed impacts faction stock prices. Victory in combat raises your faction\'s market value. Losses drain it. The war ledger tracks real-time prices of all 15 factions—watch market movements as battles unfold. Economic warfare is as important as air combat.',
  },
  {
    title: 'TERRAIN MATTERS',
    subtitle: 'Crash Dynamics',
    content:
      'Where you crash determines the damage cost and pilot survival rate. Urban terrain inflicts 15x damage multiplier but low pilot survival (10%). Desert offers low damage (0.5x) but better survival (65%). Mountains balance cost and risk. The Incident Report ledger records every loss with financial breakdown.',
  },
  {
    title: 'AI FACTION PERSONALITIES',
    subtitle: 'Predictable Enemies',
    content:
      'Each hostile faction has a unique personality profile: aggressive attackers (BNS), cautious evaders (CE), balanced operators (EC). The AI uses Q-Learning with faction personality weights to decide actions—engage, notch, crank, evade, retreat, or terrain mask. You can predict and counter each faction\'s tendencies.',
  },
  {
    title: 'YOUR MISSION',
    subtitle: 'Command Air Superiority',
    content:
      'Scramble interceptor flights. Assign patrol, loiter, and strike missions. Manage fuel, ammo, and ECM. Engage hostile aircraft in realistic combat. Build bases, upgrade radar and hangars. Lead your faction to economic and military victory in the geopolitical skies.',
  },
];

export const WelcomeTerminal: React.FC<WelcomeTerminalProps> = ({ isOpen, onClose }) => {
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (!isOpen) setCurrentPage(0);
  }, [isOpen]);

  const page = LOREBOOK[currentPage];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[6500] pointer-events-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-slate-900 border border-emerald-500/40 rounded-lg p-8 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <Terminal size={28} className="text-emerald-400" />
                <h1 className="text-2xl font-black text-emerald-400 uppercase tracking-wider">
                  {page.title}
                </h1>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <X size={28} />
              </button>
            </div>

            <div className="text-sm text-cyan-400 font-bold uppercase tracking-widest mb-4">
              {page.subtitle}
            </div>

            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 overflow-y-auto"
            >
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded p-4 text-emerald-300 text-sm leading-relaxed font-mono">
                {page.content}
              </div>
            </motion.div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-emerald-500/20">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-sm disabled:opacity-30 hover:bg-emerald-500/20 transition-colors"
              >
                ← PREV
              </button>

              <div className="flex items-center gap-2">
                {LOREBOOK.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === currentPage ? 'bg-emerald-400' : 'bg-emerald-500/30'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-500/60">
                  {currentPage + 1} / {LOREBOOK.length}
                </span>
                {currentPage === LOREBOOK.length - 1 ? (
                  <button
                    onClick={onClose}
                    className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded text-sm hover:bg-emerald-500/40 transition-colors flex items-center gap-1 font-bold"
                  >
                    BEGIN OPS <ChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-sm hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                  >
                    NEXT →
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
