import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { StockMarket } from '../types/game';
import { FACTION_SPECS_PHASE16 } from '../data/factionData';

interface WarLedgerProps {
  stockMarket: StockMarket;
  compact?: boolean;
}

const getVolatilityLevel = (volatility: number): { label: string; color: string } => {
  if (volatility > 0.3) return { label: 'EXTREME', color: 'text-red-500' };
  if (volatility > 0.2) return { label: 'HIGH', color: 'text-orange-500' };
  if (volatility > 0.1) return { label: 'MOD', color: 'text-yellow-500' };
  return { label: 'STABLE', color: 'text-green-500' };
};

export const WarLedger: React.FC<WarLedgerProps> = ({ stockMarket, compact = false }) => {
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    setPrevPrices(stockMarket.factionPrices);
  }, [stockMarket.factionPrices]);

  const sortedFactions = Object.entries(FACTION_SPECS_PHASE16)
    .map(([id, spec]) => {
      const price = stockMarket.factionPrices[id] || 100;
      const prevPrice = prevPrices[id] || 100;
      const volatility = stockMarket.volatilityIndex[id] || 0;
      const priceChanged = Math.abs(price - prevPrice) > 0.01;

      return {
        id,
        name: spec.shortName,
        color: spec.color,
        price,
        prevPrice,
        change: ((price - 100) / 100) * 100,
        volatility,
        priceChanged,
      };
    })
    .sort((a, b) => b.price - a.price);

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      <div className="text-xs font-bold text-cyan-400 uppercase flex items-center gap-2">
        <TrendingUp size={14} />
        War Ledger - Markets
      </div>

      <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
        {sortedFactions.map((faction, idx) => {
          const isUp = faction.price >= 100;
          const trend = isUp ? '+' : '';
          const volatilityInfo = getVolatilityLevel(faction.volatility);

          return (
            <motion.div
              key={faction.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`flex items-center justify-between p-1.5 rounded border transition-all ${
                isUp
                  ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
                  : 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
              } ${faction.volatility > 0.2 ? 'animate-pulse' : ''}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: faction.color }}
                />
                <div className="text-xs font-bold text-slate-200 truncate">
                  {faction.name}
                </div>
                {faction.volatility > 0.25 && (
                  <AlertCircle size={10} className="text-red-500 flex-shrink-0" />
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="text-right">
                  <motion.div
                    key={`price-${faction.id}`}
                    className="text-xs font-bold text-slate-300"
                    animate={{ scale: faction.priceChanged ? [1, 1.05, 1] : 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {faction.price.toFixed(0)}
                  </motion.div>
                  <div
                    className={`text-[10px] font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {trend}{faction.change.toFixed(1)}%
                  </div>
                  <div className={`text-[8px] font-bold ${volatilityInfo.color}`}>
                    {volatilityInfo.label}
                  </div>
                </div>
                {isUp ? (
                  <TrendingUp size={14} className="text-green-400" />
                ) : (
                  <TrendingDown size={14} className="text-red-400" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="border-t border-slate-700 mt-2 pt-2">
        <div className="text-[10px] text-slate-400 italic">
          Volatility reflects combat intensity and market reaction
        </div>
      </div>
    </div>
  );
};
