# Nutrition Dashboard Makefile
.PHONY: help install dev build start stop clean test deploy-local

# Default target
help:
	@echo "Nutrition Dashboard - Available commands:"
	@echo ""
	@echo "Development:"
	@echo "  install       - Install all dependencies"
	@echo "  dev           - Start development servers"
	@echo "  dev-backend   - Start only backend in development mode"
	@echo "  dev-frontend  - Start only frontend in development mode"
	@echo ""
	@echo "Building:"
	@echo "  build         - Build all applications"
	@echo "  build-backend - Build only backend"
	@echo "  build-frontend- Build only frontend"
	@echo ""
	@echo "Docker:"
	@echo "  docker-build  - Build Docker images"
	@echo "  docker-up     - Start all services with Docker"
	@echo "  docker-down   - Stop all Docker services"
	@echo "  docker-logs   - Show Docker logs"
	@echo ""
	@echo "Testing:"
	@echo "  test          - Run all tests"
	@echo "  test-backend  - Run backend tests"
	@echo ""
	@echo "Deployment:"
	@echo "  deploy-local  - Deploy locally with Docker"
	@echo "  clean         - Clean all build artifacts and node_modules"

# Development commands
install:
	pnpm install

dev:
	pnpm run dev:frontend & pnpm run dev:backend

dev-backend:
	pnpm run dev:backend

dev-frontend:
	pnpm run dev:frontend

# Build commands
build:
	pnpm run build:backend && pnpm run build:frontend

build-backend:
	pnpm run build:backend

build-frontend:
	pnpm run build:frontend

# Docker commands
docker-build:
	docker-compose build

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-restart:
	docker-compose restart

# Testing commands
test:
	pnpm run test:backend

test-backend:
	pnpm run test:backend

test-e2e:
	pnpm run test:e2e:backend

# Deployment commands
deploy-local: docker-build docker-up
	@echo "Local deployment started!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:3001"
	@echo "Database: localhost:5432"

# Cleanup commands
clean:
	rm -rf node_modules packages/*/node_modules packages/*/dist packages/*/.nuxt packages/*/.output
	docker system prune -f

# Git commands
git-push:
	git add .
	git commit -m "Update: $(shell date '+%Y-%m-%d %H:%M:%S')"
	git push

# Environment setup
setup-env:
	@if [ ! -f .env ]; then \
		cp env.example .env; \
		echo "Created .env file from env.example"; \
		echo "Please edit .env with your configuration"; \
	else \
		echo ".env file already exists"; \
	fi

# Health checks
health-check:
	@echo "Checking backend health..."
	@curl -f http://localhost:3001/health || echo "Backend not responding"
	@echo "Checking frontend health..."
	@curl -f http://localhost:3000 || echo "Frontend not responding"

# Database commands
db-reset:
	docker-compose down postgres
	docker volume rm nutrition-dashboard_postgres_data || true
	docker-compose up -d postgres

# Logs
logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

logs-db:
	docker-compose logs -f postgres

# Production deployment preparation
prepare-deploy: clean install build
	@echo "Project prepared for deployment"
	@echo "Docker images ready to build" 