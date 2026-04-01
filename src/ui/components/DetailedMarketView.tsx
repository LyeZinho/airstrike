import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { StockMarket } from '../../types/geopolitics';
import { PriceChart } from './PriceChart';

interface DetailedMarketViewProps {
  stockMarket: StockMarket;
  onClose: () => void;
}

const PALETTE = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'];

export const DetailedMarketView: React.FC<DetailedMarketViewProps> = ({ stockMarket, onClose }) => {
  const [expandedFaction, setExpandedFaction] = useState<string | null>(null);

  const toggleExpand = (factionId: string) => {
    setExpandedFaction(prev => prev === factionId ? null : factionId);
  };

  return (
    <div 
      className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="glass-panel bg-slate-900 border border-emerald-500/40 rounded-xl w-[600px] max-h-[80vh] overflow-y-auto p-6 font-mono text-emerald-400"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-emerald-700/50">
          <div className="flex items-center gap-2 font-bold tracking-widest text-sm">
            <Activity size={18} />
            <span>FACTION MARKETS — DETAILED ANALYSIS</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-emerald-900/30 rounded text-emerald-500 hover:text-emerald-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {stockMarket.activeFactions.map((factionId, index) => {
            const price = stockMarket.currentPrices[factionId] || 100;
            const changePercent = ((price - 100) / 100) * 100;
            const isUp = changePercent >= 0;
            
            const history = stockMarket.priceHistory[factionId] || [];
            const latestTick = history.length > 0 ? history[history.length - 1] : null;
            const volatility = latestTick ? latestTick.volatility : 0;
            
            const isExpanded = expandedFaction === factionId;
            const marketCap = (price * 1000).toFixed(0);
            const color = PALETTE[index % PALETTE.length];

            return (
              <div 
                key={factionId}
                className="border border-emerald-800/30 rounded-lg overflow-hidden bg-slate-800/20"
              >
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-emerald-900/10 transition-colors"
                  onClick={() => toggleExpand(factionId)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="font-bold text-lg w-24 truncate">{factionId}</span>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-emerald-600">PRICE</span>
                      <span className="text-emerald-100">{price.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex flex-col items-end w-16">
                      <span className="text-xs text-emerald-600">CHANGE</span>
                      <div className={`flex items-center gap-1 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        <span>{Math.abs(changePercent).toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end w-16">
                      <span className="text-xs text-emerald-600">VOLATILITY</span>
                      <span className={volatility > 0.2 ? 'text-red-400' : 'text-emerald-300'}>
                        {(volatility * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-emerald-800/30 bg-black/20"
                    >
                      <div className="p-4 flex flex-col gap-4">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-emerald-500">MARKET CAP</span>
                          <span className="text-emerald-300 text-sm">{marketCap}Cr</span>
                        </div>
                        
                        <div className="h-24 w-full">
                          <PriceChart history={history} height={80} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
