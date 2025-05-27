# Nutrition Dashboard Makefile
.PHONY: help install dev build start stop clean test deploy-local deploy-backend deploy-frontend

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
	@echo "Docker - Combined:"
	@echo "  docker-build  - Build Docker images"
	@echo "  docker-up     - Start all services with Docker"
	@echo "  docker-down   - Stop all Docker services"
	@echo "  docker-logs   - Show Docker logs"
	@echo ""
	@echo "Docker - Separate:"
	@echo "  docker-backend-up   - Start only backend with Docker"
	@echo "  docker-frontend-up  - Start only frontend with Docker"
	@echo "  docker-backend-down - Stop backend Docker service"
	@echo "  docker-frontend-down- Stop frontend Docker service"
	@echo "  docker-backend-logs - Show backend Docker logs"
	@echo "  docker-frontend-logs- Show frontend Docker logs"
	@echo ""
	@echo "Testing:"
	@echo "  test          - Run all tests"
	@echo "  test-backend  - Run backend tests"
	@echo ""
	@echo "Deployment:"
	@echo "  deploy-local     - Deploy locally with Docker (combined)"
	@echo "  deploy-backend   - Deploy only backend locally"
	@echo "  deploy-frontend  - Deploy only frontend locally"
	@echo "  setup-env-backend - Setup backend environment file"
	@echo "  setup-env-frontend- Setup frontend environment file"
	@echo "  clean            - Clean all build artifacts and node_modules"

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

# Docker commands - Combined
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

# Docker commands - Separate Backend
docker-backend-up:
	docker-compose -f docker-compose.backend.yml up -d

docker-backend-down:
	docker-compose -f docker-compose.backend.yml down

docker-backend-logs:
	docker-compose -f docker-compose.backend.yml logs -f

docker-backend-build:
	docker-compose -f docker-compose.backend.yml build

# Docker commands - Separate Frontend
docker-frontend-up:
	docker-compose -f docker-compose.frontend.yml up -d

docker-frontend-down:
	docker-compose -f docker-compose.frontend.yml down

docker-frontend-logs:
	docker-compose -f docker-compose.frontend.yml logs -f

docker-frontend-build:
	docker-compose -f docker-compose.frontend.yml build

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
	@echo "Database: Neon Cloud (external)"

deploy-backend: docker-backend-build docker-backend-up
	@echo "Backend deployment started!"
	@echo "Backend API: http://localhost:3000"
	@echo "Health check: http://localhost:3000/health"
	@echo "Database: Neon Cloud (external)"

deploy-frontend: docker-frontend-build docker-frontend-up
	@echo "Frontend deployment started!"
	@echo "Frontend: http://localhost:3001"
	@echo "Make sure backend is running on http://localhost:3000"

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

setup-env-backend:
	@if [ ! -f .env-backend ]; then \
		cp env-backend.example .env-backend; \
		echo "Created .env-backend file from env-backend.example"; \
		echo "Please edit .env-backend with your backend configuration"; \
	else \
		echo ".env-backend file already exists"; \
	fi

setup-env-frontend:
	@if [ ! -f .env-frontend ]; then \
		cp env-frontend.example .env-frontend; \
		echo "Created .env-frontend file from env-frontend.example"; \
		echo "Please edit .env-frontend with your frontend configuration"; \
	else \
		echo ".env-frontend file already exists"; \
	fi

# Health checks
health-check:
	@echo "Checking backend health..."
	@curl -f http://localhost:3000/health || echo "Backend not responding"

health-check-combined:
	@echo "Checking backend health..."
	@curl -f http://localhost:3001/health || echo "Backend not responding"
	@echo "Checking frontend health..."
	@curl -f http://localhost:3000 || echo "Frontend not responding"

# Logs
logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

logs-backend-separate:
	docker-compose -f docker-compose.backend.yml logs -f backend

logs-frontend-separate:
	docker-compose -f docker-compose.frontend.yml logs -f frontend

# Production deployment preparation
prepare-deploy: clean install build
	@echo "Project prepared for deployment"
	@echo "Docker images ready to build"

prepare-deploy-backend: clean install build-backend
	@echo "Backend prepared for deployment"
	@echo "Backend Docker image ready to build"

prepare-deploy-frontend: clean install build-frontend
	@echo "Frontend prepared for deployment"
	@echo "Frontend Docker image ready to build" 