# STRATOSFEAR - Deployment Guide

## Quick Start with Docker

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- (Optional) git

### Running with Docker Compose

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd stratosfear
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (API keys, etc.)
   ```

3. **Build and start**
   ```bash
   docker-compose up -d
   ```

4. **Access the game**
   - Production build: http://localhost:3000
   - Development mode: http://localhost:6969

5. **Check status**
   ```bash
   docker-compose ps
   docker-compose logs stratosfear
   ```

6. **Stop the service**
   ```bash
   docker-compose down
   ```

## Manual Docker Build

If you prefer manual Docker commands:

```bash
# Build the image
docker build -t stratosfear:latest .

# Run container
docker run -d \
  --name stratosfear \
  -p 3000:3000 \
  -p 6969:6969 \
  -e NODE_ENV=production \
  stratosfear:latest

# View logs
docker logs -f stratosfear
```

## Development Setup

For local development without Docker:

```bash
# Install dependencies
npm install
# or
pnpm install

# Start dev server (port 6969)
npm run dev

# In another terminal, preview production build
npm run build
npm run preview
```

## Production Deployment

### AWS EC2
```bash
# SSH into instance
ssh -i key.pem ubuntu@your-instance-ip

# Clone repository
git clone <repo-url>
cd stratosfear

# Run with Docker Compose
docker-compose up -d
```

### Google Cloud Run
```bash
# Build and push image
gcloud builds submit --tag gcr.io/PROJECT_ID/stratosfear

# Deploy
gcloud run deploy stratosfear \
  --image gcr.io/PROJECT_ID/stratosfear \
  --platform managed \
  --region us-central1 \
  --port 3000
```

### Heroku
```bash
# Login and create app
heroku login
heroku create stratosfear

# Push to Heroku
git push heroku main
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `production` | Environment (development/production) |
| `PORT` | `3000` | HTTP server port |
| `HOST` | `0.0.0.0` | Listen address |
| `VITE_API_URL` | `http://localhost:3000` | API endpoint |
| `VITE_GAME_SPEED` | `1.0` | Game simulation speed multiplier |
| `GEMINI_API_KEY` | (empty) | Optional: Gemini AI integration |

## Performance Tuning

### Docker Optimization
```bash
# Increase memory for faster builds
docker-compose up -d --memory=2g

# View resource usage
docker stats
```

### Nginx Reverse Proxy (Optional)
```nginx
upstream stratosfear {
  server localhost:3000;
}

server {
  listen 80;
  server_name stratosfear.example.com;

  location / {
    proxy_pass http://stratosfear;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

## Troubleshooting

### Container won't start
```bash
docker-compose logs stratosfear
# Check for port conflicts:
sudo lsof -i :3000
```

### Out of memory
```bash
# Increase Docker memory
docker update --memory=4g stratosfear
```

### Build fails
```bash
# Clear cache and rebuild
docker-compose down
docker system prune -a
docker-compose up --build
```

## Health Check

The service includes a built-in health check:
```bash
# Manual health check
curl http://localhost:3000

# Should return 200 if healthy
```

## Database (Optional)

For future phases with persistent storage:
```yaml
# Add to docker-compose.yml
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: stratosfear
    POSTGRES_PASSWORD: secure_password
  volumes:
    - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Monitoring

### Docker Compose logs
```bash
# Real-time logs
docker-compose logs -f stratosfear

# Last 50 lines
docker-compose logs --tail=50 stratosfear

# Specific container
docker logs -f stratosfear
```

### Prometheus metrics (future enhancement)
```bash
# Will be added in Phase 17
# Monitor game state, performance metrics
```

## Security

### Basic authentication (optional)
```bash
# Generate htpasswd file
htpasswd -c .htpasswd admin

# Add to docker-compose.yml environment
AUTH_USERNAME: admin
AUTH_PASSWORD_HASH: (from htpasswd)
```

### HTTPS setup
```bash
# Using Let's Encrypt with certbot
certbot certonly --standalone -d stratosfear.example.com

# Configure nginx to use certificates
```

## Maintenance

### Backup game state
```bash
# No persistent database yet, but prepare for Phase 17
docker exec stratosfear tar czf - /app > backup.tar.gz
```

### Update game
```bash
git pull origin main
docker-compose up --build -d
```

### Clean up old images
```bash
docker image prune -a
docker volume prune
```

## Support

For issues, check:
- README.md for game features
- .env.example for configuration
- docker-compose.yml for service setup
- GitHub Issues for known problems

---

**STRATOSFEAR v0.1.0** | Docker Deployment Ready
