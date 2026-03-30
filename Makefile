.PHONY: help install build dev preview lint clean docker-build docker-up docker-down docker-logs

help:
	@echo "STRATOSFEAR - Strategic Air Combat RTS"
	@echo ""
	@echo "Available commands:"
	@echo "  make install      - Install dependencies"
	@echo "  make dev          - Start development server (port 6969)"
	@echo "  make build        - Build for production"
	@echo "  make preview      - Preview production build (port 4173)"
	@echo "  make lint         - Run TypeScript linter"
	@echo "  make clean        - Remove build artifacts"
	@echo ""
	@echo "Docker commands:"
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-up    - Start container with docker-compose"
	@echo "  make docker-dev   - Start dev container"
	@echo "  make docker-down  - Stop and remove containers"
	@echo "  make docker-logs  - View container logs"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

preview: build
	npm run preview

lint:
	npm run lint

clean:
	npm run clean
	rm -rf node_modules

docker-build:
	docker build -t stratosfear:latest .

docker-up: docker-build
	docker-compose up -d
	@echo "STRATOSFEAR running at http://localhost:3000"

docker-dev:
	docker-compose -f docker-compose.dev.yml up -d
	@echo "STRATOSFEAR dev server at http://localhost:6969"

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f stratosfear

docker-rebuild:
	docker-compose down
	docker system prune -a -f
	docker-compose up -d --build
	@echo "Rebuild complete. STRATOSFEAR at http://localhost:3000"

# Quick start
quick-start: install build docker-up
	@echo "✅ STRATOSFEAR ready!"
	@echo "   Production: http://localhost:3000"
	@echo "   API: http://localhost:6969"

# Development quick start
quick-dev: install docker-dev
	@echo "✅ STRATOSFEAR dev environment ready!"
	@echo "   Dev server: http://localhost:6969"

# Full reset
reset: clean docker-down
	@echo "✅ Environment reset. Run 'make quick-start' to start fresh."

.DEFAULT_GOAL := help
