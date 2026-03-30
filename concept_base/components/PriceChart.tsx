import React from 'react';
import { StockMarketTick } from '../types/game';

interface PriceChartProps {
  history: StockMarketTick[];
  factionId: string;
  height?: number;
  width?: string;
}

export const PriceChart: React.FC<PriceChartProps> = ({
  history,
  factionId,
  height = 60,
  width = '100%',
}) => {
  if (!history || history.length < 2) {
    return (
      <div className="text-[10px] text-slate-500 italic">
        Insufficient data for chart
      </div>
    );
  }

  const factionHistory = history
    .filter(tick => tick.factionId === factionId)
    .slice(-50);

  if (factionHistory.length < 2) {
    return (
      <div className="text-[10px] text-slate-500 italic">
        No price history available
      </div>
    );
  }

  const prices = factionHistory.map(tick => tick.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const chartWidth = 200;
  const chartHeight = height;
  const points: [number, number][] = prices.map((price, idx) => {
    const x = (idx / (prices.length - 1)) * chartWidth;
    const y = chartHeight - ((price - minPrice) / priceRange) * (chartHeight - 10);
    return [x, y];
  });

  const pathData = points
    .map((point, idx) => (idx === 0 ? `M${point[0]},${point[1]}` : `L${point[0]},${point[1]}`))
    .join(' ');

  const latestPrice = prices[prices.length - 1];
  const isUp = latestPrice >= prices[0];

  return (
    <div className="text-[10px] text-slate-400">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width={width} height={height}>
        <defs>
          <linearGradient id={`gradient-${factionId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              stopColor={isUp ? '#10b981' : '#ef4444'}
              stopOpacity="0.3"
            />
            <stop
              offset="100%"
              stopColor={isUp ? '#10b981' : '#ef4444'}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        <path
          d={`${pathData} L${chartWidth},${chartHeight} L0,${chartHeight} Z`}
          fill={`url(#gradient-${factionId})`}
          opacity="0.3"
        />

        <path d={pathData} stroke={isUp ? '#10b981' : '#ef4444'} strokeWidth="1.5" fill="none" />

        {points.map((point, idx) => {
          if (idx % Math.ceil(points.length / 4) !== 0 && idx !== points.length - 1)
            return null;
          return (
            <circle
              key={idx}
              cx={point[0]}
              cy={point[1]}
              r="2"
              fill={isUp ? '#10b981' : '#ef4444'}
            />
          );
        })}
      </svg>

      <div className="mt-1 flex justify-between text-[9px] text-slate-500">
        <span>{minPrice.toFixed(0)}</span>
        <span className={isUp ? 'text-green-500' : 'text-red-500'}>
          {latestPrice.toFixed(0)}
        </span>
        <span>{maxPrice.toFixed(0)}</span>
      </div>
    </div>
  );
};
