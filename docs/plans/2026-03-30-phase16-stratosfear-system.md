# Phase 16: STRATOSFEAR - Corporate Military Aesthetic & Market Mechanic

**Status**: Design Document (Phase 16+ roadmap)  
**Date**: 2026-03-30  
**Dependencies**: Phase 15 (Geopolitical System) ✅

---

## 1. Visual Identity: "Corporate Military"

### Color Palette (Tailwind)
```
Primary: Navy Blue Deep (#0f172a) - slate-950
  Used for: HUD background, panels, card backgrounds
  
Secondary: Radar Green (#22c55e) - lime-500 / emerald-500
  Used for: Active radar sweeps, positive indicators, "go" states
  
Alert Red (#ef4444) - red-500
  Used for: Aircraft losses, critical warnings, falling stock prices
  
Neutral: Gray (#9ca3af) - gray-400
  Used for: Text, dividers, disabled states
  
Accent: Cyan (#06b6d4) - cyan-500
  Used for: Target locks, selected units, active menu items
```

### Typography
```
Corporate HUD: Inter (sans-serif)
  Font Weight: 500-600 (medium/semibold)
  Size: 12-16px (compact, technical)
  Usage: Dashboard titles, status displays, button labels
  Example: "FACTION STOCK TICKER", "BASE STATUS"

Technical Readout: JetBrains Mono (monospace)
  Font Weight: 400-500
  Size: 11-14px
  Usage: Radar data, prices, coordinates, log entries
  Example: "420.50 ↓ 12.5% | CRITICAL LOSS"
```

### Component Style Rules
```
Panels:
  - Background: #0f172a with 1px border of #22c55e
  - Glow effect: drop-shadow(0 0 8px rgba(34, 197, 94, 0.3))
  - Corner radius: 4px (sharp, military aesthetic)

Text:
  - Primary: #e5e7eb (gray-200)
  - Secondary: #9ca3af (gray-400)
  - High contrast for readability in tactical scenarios

Icons:
  - Size: 16-20px
  - Color match: green for active, red for critical, cyan for target
  - Animated on state change: 200ms transition
```

---

## 2. Stock Market System: "War Ledger"

### 2.1 Data Model

```typescript
// src/types/geopolitics.ts (extends existing types)

export interface FactionStock {
  factionId: string;
  factionName: string;
  ticker: string; // e.g., "N-DEF", "SOLARIS"
  
  // Market pricing
  currentPrice: number; // USD per share
  previousPrice: number; // Track change
  priceHistory: number[]; // Last 60 ticks for sparkline
  
  // Valuation drivers
  aircraftLost: number; // Cumulative losses
  aircraftDestroyed: number; // Enemy aircraft destroyed
  objectivesCompleted: number;
  baseHealthPercent: number; // 0-100
  morale: number; // From FactionState
  
  // Status
  status: 'STABLE' | 'RISING' | 'FALLING' | 'CRITICAL' | 'BANKRUPTCY';
  statusText: string; // e.g., "CRITICAL LOSS (2x F-16 Down)"
}

export interface StockEvent {
  id: string;
  timestamp: Tick;
  factionId: string;
  eventType: 'AIRCRAFT_LOSS' | 'AIRCRAFT_KILL' | 'OBJECTIVE_COMPLETE' | 'BASE_DAMAGED' | 'TREATY_SIGNED' | 'TREATY_BROKEN';
  impact: number; // -5 to +10 (price change percentage)
  description: string; // "F-16 Shot Down", "Base Health Critical", etc.
}

export interface StockMarketState {
  stocks: Record<string, FactionStock>; // factionId -> FactionStock
  events: StockEvent[]; // Last 20 events for chronicle
  gameTime: number; // Ticks
}
```

### 2.2 Pricing Logic

**Base Price Formula:**
```
price = basePrice * (1 + morale_factor + health_factor + kill_factor + loss_factor)

morale_factor = (morale - 50) / 100  // [-0.5 to +0.5]
health_factor = (baseHealthPercent - 50) / 200  // [-0.25 to +0.25]
kill_factor = (aircraftDestroyed * 2) / 1000  // [0 to +0.5 at 250 kills]
loss_factor = -(aircraftLost * 3) / 1000  // [-0.3 to 0 at 100 losses]
```

**Price Decay (per tick):**
```
If no events occur in 30 ticks:
  price *= 0.9995  // Gradual decay to baseline
  
This prevents stagnant prices and rewards active play.
```

**Status Thresholds:**
```
price >= basePrice * 1.2 → RISING
basePrice * 0.9 <= price < basePrice * 1.2 → STABLE
basePrice * 0.5 <= price < basePrice * 0.9 → FALLING
basePrice * 0.2 <= price < basePrice * 0.5 → CRITICAL
price < basePrice * 0.2 → BANKRUPTCY
```

### 2.3 Gameplay Impact: "Bankruptcy Mechanics"

**When CRITICAL or BANKRUPTCY:**
```
- AI's attack frequency: -50%
- AI's new aircraft purchase: DISABLED
- AI completes objectives slower: -30%
- Diplomacy: Other factions get -10 trust (instability)

Recovery Path:
1. Complete 3+ objectives without combat losses
2. Stock price must recover to > basePrice * 0.4
3. Takes minimum 10 game minutes at baseline

Optional: AI can request "Emergency Treaty" for neutral aid
```

### 2.4 UI Component: "Stock Ticker Widget"

**File**: `src/ui/components/WarLedger.tsx`

```tsx
// Shows 5 factions: PLAYER (you), + 4 AI factions
// Real-time price ticker with 1-minute sparkline

<WarLedger>
  [SOLARIS] 🎯 YOURS
  Price: 150.10 ↑ +5.2%
  Status: STABLE
  Last Event: Completed ELINT_MISSION (+2.1%)
  
  [N-DEF]
  Price: 420.50 ↓ -12.5%
  Status: CRITICAL LOSS
  Last Event: 2x F-16 Down (-15.3%)
  
  [UNION-RED]
  Price: 890.00 ↓ -3.1%
  Status: FALLING
  Last Event: Base Damaged (-5.0%)
  
  [IRON-GUARD]
  Price: 245.75 ↑ +1.8%
  Status: STABLE
  Last Event: Treaty Signed (+3.2%)
  
  [GRAY-WOLVES]
  Price: 102.50 ↓ -22.0%
  Status: BANKRUPTCY
  Last Event: Aircraft Loss Cascade (-25%)
</WarLedger>
```

---

## 3. War Chronicle: "The Stratosfear Chronicle"

### 3.1 News Generation Logic (EXTENDS Phase 15 NewsGeneratorSystem)

```typescript
// src/systems/ChronicleSystem.ts (NEW - Phase 16)

export class ChronicleSystem extends NewsGeneratorSystem {
  generateFinancialHeadline(event: StockEvent): NewsArticle {
    // Example: Aircraft loss becomes financial news
    
    if (event.eventType === 'AIRCRAFT_LOSS') {
      const faction = getFaction(event.factionId);
      const impact = event.impact;
      
      const templates = [
        `Ações de ${faction.name} despencam ${Math.abs(impact)}% após interceptação de ${faction.shortName}. Analistas preveem liquidação de ativos.`,
        `Perdas críticas de aeronaves forçam ${faction.name} a avaliar suas posições. Corretoras reduzem ratings para SELL.`,
        `${faction.name} sofre baque operacional. Preço cai para menor em 30 dias.`
      ];
      
      return this.buildArticle(
        faction.shortName,
        template.random(),
        'FINANCIAL',
        impact < -10 ? 'HOSTILE' : 'NEUTRAL',
        Math.abs(impact) // importance = price impact magnitude
      );
    }
  }
  
  generateResourceHeadline(objective: PassiveObjective): NewsArticle {
    // Example: Fuel shortage becomes market news
    
    if (objective.type === 'RESOURCE_HARVEST') {
      const templates = [
        `Mercado de querosene de aviação dispara. Pequenas facções economizam combustível.`,
        `Escassez de recursos força facções a escolher entre defesa e expansão.`,
        `Custos operacionais sobem. É hora para consolidação ou falência.`
      ];
      
      return this.buildArticle(
        'MARKET',
        templates.random(),
        'RESOURCE_CRISIS',
        'NEUTRAL',
        5
      );
    }
  }
}
```

### 3.2 Chronicle Feed Structure

**File**: `src/ui/components/ChroniclePanel.tsx`

```tsx
<ChroniclePanel>
  // Timestamp | Headline | Faction Bias | Importance Badge
  
  10:47 | CRITICAL
  "Ações da Northrop-Delta despencam 15% após interceptação bem-sucedida do General [SeuNome]. Analistas preveem liquidação de ativos na fronteira."
  [Bias: HOSTILE] [Source: N-DEF Watchers]
  
  10:35 | HIGH
  "Aumento no preço do Querosene de Aviação força facções menores a manterem aviões no chão. É o momento para expansão?"
  [Bias: NEUTRAL] [Source: Oil Markets]
  
  10:22 | MEDIUM
  "Tratado de Não-Agressão assinado entre SOLARIS e UNION-RED. Mercados sobem com previsões de estabilidade."
  [Bias: PATRIOTIC] [Source: SOLARIS Official]
  
  10:10 | LOW
  "Patrulha de rotina completa no Setor 7. Nenhum incidente reportado."
  [Bias: NEUTRAL] [Source: SOLARIS HQ]
</ChroniclePanel>
```

---

## 4. Radar System: "Trembling Detection" (Notching Mechanic)

### 4.1 Detection Realism Model

```typescript
// src/systems/RadarDetectionSystem.ts (NEW - Phase 16)

export interface RadarSignature {
  aircraftId: string;
  rcsValue: number; // Aircraft's radar cross-section
  notchingAngle: number; // Angle relative to radar bore
  detectionConfidence: number; // 0-100%
  trembleIntensity: number; // 0-100%, for UI animation
}

/**
 * NOTCHING: Aircraft flying perpendicular to radar beam
 * - Radar sees only wing edge (minimal RCS)
 * - Detection fails or severely degrades
 * - Used by real pilots to evade SAM radar
 */
export function calculateDetectionConfidence(
  radarBearing: number,
  aircraftHeading: number,
  rcsValue: number,
  range: number
): { confidence: number; trembleIntensity: number } {
  
  // Angle between radar bore and aircraft
  const angleOff = Math.abs(radarBearing - aircraftHeading);
  const normalizedAngle = Math.min(angleOff, 360 - angleOff);
  
  // Notching detection: 80-100° = maximum evasion
  const isNotching = normalizedAngle > 70 && normalizedAngle < 110;
  
  if (isNotching) {
    // Confidence drops to 20-40%
    const baseConfidence = Math.random() * 20 + 20;
    return {
      confidence: Math.max(10, baseConfidence - rcsValue / 10),
      trembleIntensity: 80 + Math.random() * 20 // Icon trembles heavily
    };
  }
  
  // Normal detection
  const baseConfidence = 85 - (range / 100); // Degrades with distance
  const rcsFactor = rcsValue / 10; // Low RCS = harder to detect
  
  return {
    confidence: Math.max(40, baseConfidence - rcsFactor),
    trembleIntensity: Math.max(0, rcsFactor - 50) // Slight tremble for stealthy aircraft
  };
}
```

### 4.2 UI Rendering: "Trembling Icon"

**File**: `src/ui/components/RadarSweep.tsx`

```tsx
interface RadarContactProps {
  signature: RadarSignature;
}

export function RadarContact({ signature }: RadarContactProps) {
  const trembleAnimation = `
    @keyframes tremble {
      0%, 100% { transform: translate(0, 0); opacity: 1; }
      25% { transform: translate(2px, 1px); opacity: ${0.5 + signature.trembleIntensity / 200}; }
      50% { transform: translate(-2px, -1px); opacity: ${0.5 + signature.trembleIntensity / 200}; }
      75% { transform: translate(1px, -2px); opacity: ${0.5 + signature.trembleIntensity / 200}; }
    }
  `;
  
  const confidenceColor = signature.detectionConfidence > 70
    ? 'text-lime-500' // Confirmed
    : signature.detectionConfidence > 40
    ? 'text-amber-500' // Uncertain
    : 'text-red-500'; // Lost contact
  
  return (
    <div
      className={`absolute ${confidenceColor}`}
      style={{
        animation: `tremble ${signature.trembleIntensity / 100}s infinite`,
        opacity: signature.detectionConfidence / 100
      }}
    >
      ◆ {signature.detectionConfidence.toFixed(0)}%
    </div>
  );
}
```

### 4.3 Detection State Machine

```
CONFIRMED (confidence > 75%)
├─ Icon: Solid green diamond
├─ Opacity: 100%
├─ Attack: Allowed
└─ Duration: Stays confirmed for 5 ticks after confirmation

UNCERTAIN (40% ≤ confidence ≤ 75%)
├─ Icon: Trembling amber diamond
├─ Opacity: 60-80%
├─ Attack: Missiles are less accurate (-30% guidance precision)
└─ Duration: Can toggle between CONFIRMED↔UNCERTAIN

LOST_CONTACT (confidence < 40%)
├─ Icon: Rapidly flickering red diamond (or disappears)
├─ Opacity: 20-40%
├─ Attack: BLOCKED (cannot target)
└─ Action: Requires visual confirmation or re-acquisition (30+ ticks)
```

---

## 5. Market Events: Dynamic Gameplay Triggers

### 5.1 Event System

```typescript
// src/systems/MarketEventSystem.ts (NEW - Phase 16)

export enum MarketEventType {
  // Price-affecting
  STOCK_CRASH = 'STOCK_CRASH',             // -15% to -30%
  RALLY_DAY = 'RALLY_DAY',                 // +10% to +20%
  RESOURCE_SHORTAGE = 'RESOURCE_SHORTAGE', // Costs ↑ 20%
  TECH_BREAKTHROUGH = 'TECH_BREAKTHROUGH', // +15% for 1 faction
  
  // Diplomatic
  SCANDAL = 'SCANDAL',                     // -10% trust to all
  MERGER = 'MERGER',                       // 2 factions ally, gain shared stock
  HOSTILE_TAKEOVER = 'HOSTILE_TAKEOVER',   // Forced alliance or war
  
  // Strategic
  EMBARGO = 'EMBARGO',                     // Block 1 faction's resource trading
  SUPPLY_CHAIN_BREAKTHROUGH = 'SUPPLY_CHAIN_BREAKTHROUGH', // +25% resource income
}

export function triggerRandomMarketEvent(gameTime: Tick): MarketEventType | null {
  // Every 300 ticks (~5 minutes), 30% chance of event
  if (gameTime % 300 !== 0 || Math.random() > 0.3) return null;
  
  const events = [
    MarketEventType.STOCK_CRASH,
    MarketEventType.RALLY_DAY,
    MarketEventType.RESOURCE_SHORTAGE,
    MarketEventType.TECH_BREAKTHROUGH,
    MarketEventType.SCANDAL,
  ];
  
  return events[Math.floor(Math.random() * events.length)];
}

export function applyMarketEvent(
  event: MarketEventType,
  factionId: string,
  state: WarRoomState
): void {
  const faction = state.factions.find(f => f.id === factionId);
  if (!faction) return;
  
  switch (event) {
    case MarketEventType.STOCK_CRASH:
      // -20% price for random faction
      const targetFaction = state.factions[Math.floor(Math.random() * state.factions.length)];
      targetFaction.morale -= 15;
      this.generateCrashHeadline(targetFaction);
      break;
    
    case MarketEventType.RESOURCE_SHORTAGE:
      // All factions pay +20% for resources
      state.factions.forEach(f => {
        f.credits -= f.credits * 0.1; // Emergency spending
      });
      this.generateShortageHeadline();
      break;
    
    // ... more cases
  }
}
```

### 5.2 Event Examples & Gameplay Impact

| Event | Trigger | Effect | Chronicle Headline |
|---|---|---|---|
| **Stock Crash** | Random, every 5 min | -20% price for victim faction | "Market turbulence hits [FACTION]. Investors flee." |
| **Rally Day** | Random, every 5 min | +15% price for lucky faction | "[FACTION] stocks soar on positive earnings." |
| **Resource Shortage** | No major harvests in 10 min | All factions cost +20% for supplies | "Fuel crisis forces military cutbacks across regions." |
| **Tech Breakthrough** | Faction wins 3 combats | +20% aircraft efficiency, +25% price | "New combat doctrine gives [FACTION] edge." |
| **Scandal** | Faction reputation <30 | -10% diplomacy for ALL factions | "[FACTION] accused of war crimes. Alliances tested." |
| **Embargo** | Trade treaty broken | Victim faction cannot trade resources | "UN imposes sanctions on [FACTION]." |

---

## 6. Integration Checklist (Phase 16 Implementation)

### 6.1 Type System
- [ ] Extend `geopolitics.ts` with `FactionStock`, `StockEvent`, `StockMarketState`
- [ ] Extend `entities.ts` GameState: add `stockMarket: StockMarketState`

### 6.2 Systems
- [ ] Create `src/systems/StockMarketSystem.ts` (pricing, status calculation)
- [ ] Create `src/systems/ChronicleSystem.ts` (financial news generation)
- [ ] Create `src/systems/RadarDetectionSystem.ts` (notching + trembling)
- [ ] Create `src/systems/MarketEventSystem.ts` (random events + diplomacy effects)

### 6.3 UI Components
- [ ] Create `src/ui/components/WarLedger.tsx` (stock ticker)
- [ ] Create `src/ui/components/ChroniclePanel.tsx` (news feed)
- [ ] Update `src/ui/components/RadarSweep.tsx` (add trembling animation + confidence coloring)
- [ ] Create `src/ui/components/MarketAlerts.tsx` (event notifications)

### 6.4 SimulationEngine Integration
- [ ] Add `StockMarketSystem` to tick loop (every 10 ticks: recalculate prices, check events)
- [ ] Add `ChronicleSystem` to tick loop (generate headlines from price changes)
- [ ] Add `RadarDetectionSystem` to SimulationEngine.updateAircraftDetection() (incorporate notching)
- [ ] Add `MarketEventSystem` to tick loop (trigger random events)

### 6.5 GameState Wiring
- [ ] Initialize `stockMarket` in GameState on game start
- [ ] Update `stockMarket.stocks` on each aircraft loss/kill
- [ ] Update `stockMarket.events` on each significant event
- [ ] Sync `stockMarket` ↔ `useWarRoomStore` (Zustand)

### 6.6 Styling
- [ ] Apply STRATOSFEAR color palette to all new components (navy, radar-green, alert-red)
- [ ] Import Inter + JetBrains Mono fonts in `src/index.css`
- [ ] Add CSS animations: stock price ticker, radar tremble, news fade-in
- [ ] Glow effects for panels (#22c55e shadow)

---

## 7. Example Game Flow (Phase 16 Active)

```
TICK 0-100: Game starts
├─ SOLARIS (you) initialized at price 100.00
├─ AI factions initialized at various prices
└─ Chronicle panel: "Market opens at dawn. Watch the skies."

TICK 500: First combat
├─ N-DEF loses F-16 (-5% price → 95.50)
├─ You destroy F-16 (+3% price → 103.00)
├─ Stock Ledger updates live
└─ Chronicle: "Northrop-Delta suffers first loss. Recovery uncertain."

TICK 1500: Resource event
├─ Fuel shortage triggered (RESOURCE_SHORTAGE event)
├─ All factions' costs ↑ 20%
├─ N-DEF morale drops (bankruptcy risk growing)
└─ Chronicle: "Crisis in energy markets. Smaller players face choices."

TICK 2000: N-DEF enters CRITICAL
├─ N-DEF price: 42.00 (-50% from start)
├─ N-DEF stops attacking (saves resources)
├─ You can press advantage or offer Treaty
└─ Chronicle: "Northrop-Delta in freefall. Liquidation looms?"

TICK 2500: AI requests Treaty
├─ N-DEF offers: "Reduce hostilities, mutual non-interference"
├─ Acceptance: N-DEF recovers (price stabilizes), but you lose some objectives
└─ Chronicle: "Unlikely alliance brings stability to conflict zone."

TICK 3000+: Gameplay continues with stock market as meta-game
├─ Your decisions affect faction health → stock prices → future behavior
├─ Stock prices affect how AI plays (bankrupt AI ≠ threat)
└─ War becomes economic as much as military
```

---

## 8. Design Philosophy: "War as Wall Street"

The STRATOSFEAR aesthetic merges military simulation with financial thriller:

1. **Stock prices = faction health** (visible, transparent)
2. **Chronicle news = dramatic narrative** (engaging, lore-driven)
3. **Radar trembling = tactical tension** (realistic, high-stakes)
4. **Market events = unpredictability** (keeps game dynamic, challenging)

**Goal**: Transform RTS from "click army, win fight" to "understand enemy economy, predict behavior, win war."

---

## Notes for Phase 16 Developer

- **Skill to load**: `superpowers/brainstorming` (confirm financial mechanics make sense)
- **Dependencies**: Phase 15 (geopolitical system must be complete + tested)
- **Estimated effort**: 6-8 hours (assuming Phase 15 is solid)
- **Testing priority**: Stock price calculations + AI bankruptcy behavior
- **User feedback loop**: Watch if stock market creates emergent gameplay (or feels gimmicky)

---

**END OF PHASE 16 DESIGN DOCUMENT**
