import React, { useMemo } from 'react';
import { StockMarketTick } from '../../types/geopolitics';

interface PriceChartProps {
  history: StockMarketTick[];
  height?: number;
  width?: string;
}

export const PriceChart: React.FC<PriceChartProps> = ({ 
  history, 
  height = 100, 
  width = '100%' 
}) => {
  const chartData = useMemo(() => {
    if (!history || history.length < 2) return null;
    
    // Filter to last 50 ticks
    const data = history.slice(-50);
    
    if (data.length < 2) return null;

    const firstPrice = data[0].price;
    const lastPrice = data[data.length - 1].price;
    const isUp = lastPrice >= firstPrice;
    
    const minPrice = Math.min(...data.map(t => t.price));
    const maxPrice = Math.max(...data.map(t => t.price));
    
    // Colors
    const color = isUp ? '#10b981' : '#ef4444'; // Emerald vs Red
    
    // Scale data to viewBox
    const viewBoxWidth = 200;
    const viewBoxHeight = height;
    
    const priceRange = maxPrice - minPrice || 1; // avoid divide by 0
    
    const points = data.map((t, i) => {
      const x = (i / (data.length - 1)) * viewBoxWidth;
      const y = viewBoxHeight - ((t.price - minPrice) / priceRange) * viewBoxHeight;
      return { x, y, price: t.price };
    });
    
    const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
    const areaPathD = `${pathD} L ${viewBoxWidth},${viewBoxHeight} L 0,${viewBoxHeight} Z`;
    
    // Select dots to display (4 evenly spaced + last)
    const dotIndices = [
      0, 
      Math.floor((data.length - 1) * 0.25),
      Math.floor((data.length - 1) * 0.5),
      Math.floor((data.length - 1) * 0.75),
      data.length - 1
    ];
    
    // Make unique indices just in case it's a small array
    const uniqueDotIndices = Array.from(new Set(dotIndices));
    const dots = uniqueDotIndices.map(index => points[index]);

    return {
      points,
      pathD,
      areaPathD,
      minPrice,
      maxPrice,
      lastPrice,
      color,
      dots,
      viewBoxWidth,
      viewBoxHeight
    };
  }, [history, height]);

  if (!chartData) {
    return (
      <div 
        className="flex items-center justify-center font-mono text-xs text-emerald-700/50"
        style={{ height, width }}
      >
        Insufficient data
      </div>
    );
  }

  const { pathD, areaPathD, minPrice, maxPrice, lastPrice, color, dots, viewBoxWidth, viewBoxHeight } = chartData;

  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex flex-col relative" style={{ width, height: height + 24 }}>
      <svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} 
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        
        {/* Fill Area */}
        <path 
          d={areaPathD} 
          fill={`url(#${gradientId})`} 
        />
        
        {/* Line */}
        <path 
          d={pathD} 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
          vectorEffect="non-scaling-stroke"
        />
        
        {/* Dots */}
        {dots.map((dot, i) => (
          <circle 
            key={i} 
            cx={dot.x} 
            cy={dot.y} 
            r="3" 
            fill={color} 
            className="drop-shadow-sm"
          />
        ))}
      </svg>
      
      {/* Labels below */}
      <div className="flex justify-between items-center text-[10px] font-mono mt-1 px-1">
        <span className="text-emerald-500/70">MIN {minPrice.toFixed(0)}</span>
        <span style={{ color }}>{lastPrice.toFixed(2)}</span>
        <span className="text-emerald-500/70">MAX {maxPrice.toFixed(0)}</span>
      </div>
    </div>
  );
};
