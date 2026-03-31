import React from 'react';
import { NewsArticle } from '../../types/geopolitics';
import { AlertCircle, TrendingUp, TrendingDown, Radio, Clock, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GlobalMonitorProps {
  articles: NewsArticle[];
  onArticleClick?: (article: NewsArticle) => void;
}

export const GlobalMonitor: React.FC<GlobalMonitorProps> = ({ articles, onArticleClick }) => {
  const getBiasColor = (bias: NewsArticle['bias']): string => {
    switch (bias) {
      case 'PATRIOTIC':
        return 'text-emerald-400';
      case 'HOSTILE':
        return 'text-red-400';
      case 'NEUTRAL':
        return 'text-slate-400';
      default:
        return 'text-gray-400';
    }
  };

  const getCategoryIcon = (category: NewsArticle['category']) => {
    switch (category) {
      case 'MILITARY':
        return <ShieldAlert className="w-3.5 h-3.5 text-red-500" />;
      case 'VICTORY':
        return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
      case 'SETBACK':
        return <TrendingDown className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Radio className="w-3.5 h-3.5 text-emerald-500" />;
    }
  };

  return (
    <div className="flex-1 w-full h-full">
      <div className="space-y-3">
        {(!articles || articles.length === 0) && (
          <div className="text-[10px] text-slate-600 text-center py-6 opacity-30 tracking-widest italic uppercase">Waiting for News Feed...</div>
        )}
        <AnimatePresence mode="popLayout">
          {articles && articles.slice(0, 20).map((article, idx) => (
            <motion.div
              key={`article-${article.id || 'none'}-${idx}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="relative group bg-[#0a0a1a]/40 border-l-2 border-l-emerald-500/30 border border-white/5 rounded p-3 hover:bg-emerald-500/5 hover:border-l-emerald-500 cursor-pointer transition-all overflow-hidden"
              onClick={() => onArticleClick?.(article)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-slate-900 border border-white/5">
                    {getCategoryIcon(article.category)}
                  </div>
                  <span className="text-[7px] font-black text-slate-500 tracking-[0.2em] uppercase">
                    {article.category || 'GENERAL'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 opacity-40">
                  <Clock size={10} className="text-emerald-500" />
                  <span className="text-[8px] font-bold text-slate-400">
                    {article.timestamp ? new Date(article.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '00:00:00'}
                  </span>
                </div>
              </div>

              <p className={`text-[10px] font-bold uppercase tracking-wider leading-snug ${getBiasColor(article.bias)} group-hover:text-white transition-colors`}>
                {article.headline || 'NO DATA RECEIVED'}
              </p>

              <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1">
                   <span className="text-[7px] text-slate-600 font-black tracking-widest uppercase">REL_BIAS:</span>
                   <span className={`text-[8px] font-black ${getBiasColor(article.bias)}`}>{article.bias || 'UNKNOWN'}</span>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-[7px] text-slate-600 font-black tracking-widest uppercase">INTEL_CONF:</span>
                   <span className="text-[8px] text-emerald-400 font-bold">
                    {((article.importance || 0) * 10)}%
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
