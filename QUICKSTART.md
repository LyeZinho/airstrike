# STRATOSFEAR - Quick Start Guide

## 🚀 Start in 60 Seconds

### Option 1: Docker (Recommended)
```bash
# One command to start everything
docker-compose up -d

# Game is ready at http://localhost:3000
```

### Option 2: Local Development
```bash
npm install
npm run dev

# Game runs at http://localhost:6969
```

### Option 3: Using Make (Linux/Mac)
```bash
make quick-start     # Docker production
# or
make quick-dev       # Docker development
```

---

## 📋 Common Commands

| Goal | Command |
|------|---------|
| **Start locally** | `npm run dev` |
| **Build for production** | `npm run build` |
| **Preview built version** | `npm run preview` |
| **Run in Docker** | `docker-compose up -d` |
| **View Docker logs** | `docker-compose logs -f` |
| **Stop Docker** | `docker-compose down` |
| **Full rebuild** | `make docker-rebuild` |
| **Show all commands** | `make help` |

---

## 🎮 How to Play

1. **Open the game** at http://localhost:3000 (Docker) or http://localhost:6969 (local)

2. **Control Aircraft**
   - Click on an aircraft to select it
   - Right-click to set patrol/engage target
   - Use radar to detect enemies

3. **Manage Base**
   - Click "BUILD" to construct defensive systems
   - Monitor fuel and ammunition supply
   - Track pilot experience with Q-Learning AI

4. **Handle Legal Matters** (Phase 16 Feature)
   - Click "LEGAL" to see active lawsuits
   - Choose: Pay, Contest in court, or Ignore (triggers war)
   - Influence courtroom decisions with lobbying

5. **Watch Stock Market**
   - Click "MARKET" to see faction stock prices
   - Prices move based on military losses and legal outcomes

---

## 📁 File Structure

```
stratosfear/
├── concept_base/        ← Main game (React + Zustand)
│   ├── components/      ← UI components
│   ├── store/           ← State management
│   ├── utils/           ← Game logic
│   ├── data/            ← Faction configs
│   └── main.tsx         ← Entry point
├── dist/                ← Production build
├── Dockerfile           ← Docker image definition
├── docker-compose.yml   ← Production Docker config
├── docker-compose.dev.yml ← Development Docker config
├── Makefile             ← Convenient commands
├── README.md            ← Full documentation
├── DEPLOYMENT.md        ← Deployment guide
└── package.json         ← Dependencies
```

---

## 🐳 Docker Commands Reference

```bash
# Check if running
docker-compose ps

# View real-time logs
docker-compose logs -f stratosfear

# Stop without removing
docker-compose stop

# Resume after stop
docker-compose start

# Stop and remove everything
docker-compose down

# Rebuild image after code changes
docker-compose up -d --build

# Remove old images to save space
docker image prune -a
```

---

## 🔧 Configuration

Create `.env` file to customize:
```env
NODE_ENV=production
VITE_API_URL=http://localhost:3000
VITE_GAME_SPEED=1.0
```

Available variables:
- `NODE_ENV`: development / production
- `VITE_API_URL`: API endpoint
- `VITE_GAME_SPEED`: Simulation speed (1.0 = normal, 2.0 = 2x speed)
- `PORT`: Server port (default 3000)
- `GEMINI_API_KEY`: Optional AI features

---

## 📊 Game Features

### Core
✅ Real-time air combat  
✅ Radar simulation (RWS/TWS/STT modes)  
✅ Missile warfare  
✅ Base management  

### Phase 16 (Current)
✅ Legal system (Tribunal de Estratosfera)  
✅ Stock market integration  
✅ Incident reporting  
✅ Diplomatic relations  
✅ AI learning (Q-Learning)  

### Upcoming
🔜 Trading terminals  
🔜 Special operations  
🔜 Campaign mode  

---

## ⚡ Performance Notes

- **Local dev**: Fast HMR, full source maps
- **Docker**: Optimized production build
- **Build size**: ~691 KB JS (205 KB gzip)
- **Recommended RAM**: 2 GB minimum
- **Browser**: Chrome, Firefox, Safari, Edge (WebGL required)

---

## 🐛 Troubleshooting

### "Port 3000 already in use"
```bash
# Find what's using it
lsof -i :3000

# Use different port
PORT=3001 npm run preview
```

### "Docker container exits immediately"
```bash
docker-compose logs stratosfear
# See error message and check DEPLOYMENT.md
```

### "Slow performance in Docker"
```bash
# Increase Docker memory
docker update --memory=4g stratosfear
```

### "Game won't load"
1. Check browser console (F12)
2. Verify port is accessible: `curl http://localhost:3000`
3. Check firewall/antivirus blocking

---

## 📞 Support

- **Full docs**: See `README.md`
- **Deployment help**: See `DEPLOYMENT.md`
- **Architecture**: See `concept_base/` subdirectories
- **Issues**: Check GitHub issues or create new one

---

## 🎯 Next Steps

1. **Play a mission** - Get familiar with controls
2. **Trigger a lawsuit** - Destroy your own aircraft and get sued
3. **Fight in court** - Contest evidence and see odds
4. **Check stock impact** - See market react to outcomes

**Enjoy STRATOSFEAR!** ✈️⚖️📈

---

Version 0.1.0 | Last updated: March 30, 2026
