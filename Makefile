.PHONY: install setup dev test lint format security docker-build clean ci help

install: ## Install dependencies
	npm ci

setup: install ## Full setup (install + pre-commit hooks + verify)
	npx husky install || true
	@echo ""
	@echo "✅ Mattis Abenteuer setup complete!"
	@echo "   Run 'make dev' to start the game."
	@echo ""

dev: ## Start Vite dev server
	npm run dev

test: ## Run tests with coverage
	npm run test

lint: ## Run ESLint
	npm run lint

format: ## Auto-format code with Prettier
	npm run format

security: ## Run security audit
	npm audit --audit-level=moderate

docker-build: ## Build Docker image
	docker build -t mattis-abenteuer:latest .

clean: ## Remove build artifacts
	rm -rf dist coverage node_modules/.cache

ci: lint test ## Run full CI locally (lint + test + build)
	npm run build

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
