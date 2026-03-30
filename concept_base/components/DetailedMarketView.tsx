import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, TrendingUp } from 'lucide-react';
import { StockMarket } from '../types/game';
import { FACTION_SPECS_PHASE16 } from '../data/factionData';
import { PriceChart } from './PriceChart';

interface DetailedMarketViewProps {
  stockMarket: StockMarket;
}

export const DetailedMarketView: React.FC<DetailedMarketViewProps> = ({ stockMarket }) => {
  const [expandedFaction, setExpandedFaction] = useState<string | null>(null);

  const sortedFactions = Object.entries(FACTION_SPECS_PHASE16)
    .map(([id, spec]) => ({
      id,
      name: spec.fullName,
      shortName: spec.shortName,
      color: spec.color,
      price: stockMarket.factionPrices[id] || 100,
      volatility: stockMarket.volatilityIndex[id] || 0,
      change: ((stockMarket.factionPrices[id] || 100) - 100) / 100,
    }))
    .sort((a, b) => b.price - a.price);

  return (
    <div className="space-y-3">
      <div className="text-xs font-bold text-cyan-400 uppercase flex items-center gap-2 mb-4">
        <TrendingUp size={16} />
        FACTION MARKETS - DETAILED ANALYSIS
      </div>

      <div className="space-y-2">
        {sortedFactions.map((faction, idx) => {
          const isExpanded = expandedFaction === faction.id;
          const pricePercent = faction.change * 100;
          const isUp = faction.price >= 100;

          return (
            <motion.div
              key={faction.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded border bg-slate-900/50 border-slate-700/50 overflow-hidden"
            >
              <button
                onClick={() => setExpandedFaction(isExpanded ? null : faction.id)}
                className="w-full p-3 hover:bg-slate-800/50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-4 h-4 rounded flex-shrink-0"
                    style={{ backgroundColor: faction.color }}
                  />
                  <div className="text-left min-w-0">
                    <div className="text-xs font-bold text-slate-100">
                      {faction.shortName}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {faction.name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-200">
                      {faction.price.toFixed(1)}
                    </div>
                    <div
                      className={`text-xs font-bold ${
                        isUp ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {isUp ? '+' : ''}{pricePercent.toFixed(1)}%
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={16} className="text-slate-500" />
                  </motion.div>
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-slate-700/50 bg-slate-950/50 p-3"
                  >
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                        <div>
                          <div className="text-slate-500 font-bold">Market Cap</div>
                          <div className="text-slate-200">{(faction.price * 1000).toFixed(0)}Cr</div>
                        </div>
                        <div>
                          <div className="text-slate-500 font-bold">Volatility</div>
                          <div className={faction.volatility > 0.2 ? 'text-red-400 font-bold' : 'text-slate-200'}>
                            {(faction.volatility * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-500 font-bold mb-2">
                          50-Tick History
                        </div>
                        <PriceChart
                          history={stockMarket.history}
                          factionId={faction.id}
                          height={80}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <div className="border-t border-slate-700 pt-2 mt-4">
        <div className="text-[10px] text-slate-500 italic space-y-1">
          <div>Market data updates in real-time during combat operations</div>
          <div>High volatility (20%+) indicates active military engagements nearby</div>
        </div>
      </div>
    </div>
  );
};
