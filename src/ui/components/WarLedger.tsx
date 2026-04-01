import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { StockMarket } from '../../types/geopolitics';

interface WarLedgerProps {
  stockMarket: StockMarket;
  compact?: boolean;
}

const PALETTE = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'];

export const WarLedger: React.FC<WarLedgerProps> = ({ stockMarket, compact = false }) => {
  const sortedFactions = useMemo(() => {
    return [...stockMarket.activeFactions].sort((a, b) => {
      const priceA = stockMarket.currentPrices[a] || 0;
      const priceB = stockMarket.currentPrices[b] || 0;
      return priceB - priceA;
    });
  }, [stockMarket.activeFactions, stockMarket.currentPrices]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <div className="glass-panel bg-slate-900/50 border-emerald-700/50 p-4 font-mono w-full max-w-sm">
      <div className="flex items-center gap-2 mb-4 text-emerald-400 font-mono text-xs uppercase border-b border-emerald-700/30 pb-2">
        <TrendingUp size={14} />
        <span>WAR LEDGER — MARKETS</span>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-1"
      >
        {sortedFactions.map((factionId) => {
          const originalIndex = stockMarket.activeFactions.indexOf(factionId);
          const color = PALETTE[originalIndex % PALETTE.length];
          const price = stockMarket.currentPrices[factionId] || 100;
          const changePercent = ((price - 100) / 100) * 100;
          const isUp = changePercent >= 0;
          
          const history = stockMarket.priceHistory[factionId];
          const latestTick = history && history.length > 0 ? history[history.length - 1] : null;
          const volatility = latestTick ? latestTick.volatility : 0;
          const isVolatile = volatility > 0.2;

          return (
            <motion.div 
              key={factionId}
              variants={itemVariants}
              className={`flex items-center justify-between p-2 rounded text-sm ${isUp ? 'bg-emerald-900/10' : 'bg-red-900/10'}`}
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: color }}
                />
                <span className="text-emerald-300 w-16 truncate">{factionId}</span>
                {isVolatile && (
                  <AlertCircle size={12} className="text-red-500 animate-pulse" />
                )}
              </div>
              
              <div className="flex items-center gap-4 text-right">
                <span className="text-emerald-100 w-12">{price.toFixed(1)}</span>
                <span className={`w-12 text-xs ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isUp ? '+' : ''}{changePercent.toFixed(1)}%
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};
