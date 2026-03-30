# STRATOSFEAR

**Strategic Air Combat RTS with Geopolitical Simulation**

A real-time strategy game featuring Phase 16 STRATOSFEAR expansion with advanced legal systems, stock market integration, and diplomatic mechanics.

## Features

### Core Gameplay
- **Air Combat**: F-16, MiG-29, Gripen, Rafale aircraft with realistic physics
- **Radar Systems**: RWS, TWS, STT tracking modes with detection probability
- **Missile Warfare**: Short/Medium/Long-range missile systems
- **Base Management**: Resource allocation, building construction, unit deployment

### Phase 16: STRATOSFEAR Expansion
- **Tribunal de Estratosfera**: Legal system with lawsuits, evidence-based contestation, and diplomatic outcomes
- **Stock Market**: Faction price volatility tied to military losses and legal outcomes
- **Incident Reporting**: Detailed crash analysis with terrain damage calculations
- **Diplomatic Relations**: Casus Belli declarations, faction AI personalities, alliance tracking
- **AI Q-Learning**: Enemy aircraft learning from engagement patterns

## Quick Start

### Development
```bash
# Install dependencies
npm install

# Start dev server (port 6969)
npm run dev

# Build for production
npm run build
```

### Docker
```bash
# Build and run with Docker Compose
docker-compose up -d

# Access at http://localhost:3000
```

## Project Structure

```
stratosfear/
├── concept_base/          # Main game codebase
│   ├── components/        # React UI components (HUD, panels, modals)
│   ├── store/             # Zustand state management
│   ├── utils/             # Game logic (physics, legal system, AI)
│   ├── data/              # Faction data, specs, personalities
│   ├── types/             # TypeScript interfaces
│   ├── constants/         # Aircraft/missile/unit specs
│   └── main.tsx           # Entry point
├── dist/                  # Production build
├── index.html             # HTML template
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── vite.config.ts         # Vite bundler config
└── tailwind.config.ts     # Tailwind CSS config
```

## Game Systems

### Legal System (Tribunal de Estratosfera)
- **Auto-Lawsuit**: Triggered when player aircraft crash from enemy fire
- **Contestation**: Evidence-based defense with odds calculation
- **Influence Lobbying**: Buy political favor (2000 credits/point, max 20)
- **Outcomes**: Payment, Legal Victory, Legal Defeat, or War Declaration

### Stock Market
- Faction prices volatilize based on military losses and legal outcomes
- Lawsuit victories: -10% (plaintiff loses confidence)
- Lawsuit defeats: +15% (plaintiff gains confidence)
- Historical tick data maintained (last 100 ticks)

### Incident Reporting
- Crash location, terrain type, pilot status
- Financial impact calculation
- Automatic lawsuit creation for enemy-caused crashes

## Game Controls

| Control | Action |
|---------|--------|
| **Click Aircraft** | Select for control |
| **Right-click** | Set patrol/engage target |
| **"LEGAL" Button** | Open Tribunal (see active lawsuits) |
| **"BUILD" Button** | Enter construction mode |
| **"MARKET" Button** | View stock price history |

## Configuration

### Environment Variables
```env
# .env file
VITE_API_URL=http://localhost:3000
VITE_GAME_SPEED=1.0
```

### Game Constants
- **Lawsuit Deadline**: 48 game hours
- **1 Game Hour**: 60,000 ms real time
- **Max Legal Influence**: 20 points
- **CasusBelli Duration**: 1 week (7 days)
- **SAM Engagement Range**: 80km
- **Radar Range**: Faction-dependent (120-300km)

## System Requirements

- Node.js 16+
- Modern browser with WebGL support
- 4GB RAM minimum
- 500MB disk space

## Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **State**: Zustand
- **Bundler**: Vite
- **Animation**: Motion (Framer Motion)
- **Geolocation**: Leaflet, @turf/turf
- **Game Logic**: Custom physics engine, Q-Learning AI

## Building for Production

```bash
npm run build

# Output in ./dist/
# Test production build
npm run preview
```

Output sizes:
- JS: ~691 kB (205 kB gzip)
- CSS: ~76 kB (16.5 kB gzip)

## Contributing

This project is under active development. Phase 16 expansion includes:
- [ ] AI faction trading post-combat
- [ ] Dynamic treaty negotiation system
- [ ] Special operations missions
- [ ] Campaign mode with persistent war

## License

Proprietary - STRATOSFEAR © 2026

## Development Roadmap

### Phase 17: Economic Warfare
- Trading terminals between factions
- Resource embargoes
- Black market procurement

### Phase 18: Special Operations
- Sabotage missions
- Intelligence gathering
- Covert base raids

### Phase 19: Campaign Mode
- Persistent map saves
- Multi-mission campaigns
- Faction reputation system

---

**Latest Update**: Legal System Integration (Tribunal de Estratosfera)  
**Status**: Alpha (Phase 16 Complete)  
**Port**: 6969 (dev), 3000 (docker)
