.PHONY: setup dev dev-api dev-web test test-backend test-frontend lint lint-backend lint-frontend types migrate

BACKEND := backend
FRONTEND := frontend
# Frontend targets are no-ops until T-002 adds frontend/package.json.
HAS_FRONTEND := $(wildcard $(FRONTEND)/package.json)

setup:
	cd $(BACKEND) && uv sync
ifneq ($(HAS_FRONTEND),)
	cd $(FRONTEND) && pnpm install
endif

dev:
	$(MAKE) -j2 dev-api dev-web

dev-api:
	cd $(BACKEND) && uv run uvicorn app.main:app --reload --port 8000

dev-web:
ifneq ($(HAS_FRONTEND),)
	cd $(FRONTEND) && pnpm dev
else
	@echo "frontend/ not set up yet (T-002); skipping UI"
endif

test: test-backend test-frontend

test-backend:
	cd $(BACKEND) && uv run pytest

test-frontend:
ifneq ($(HAS_FRONTEND),)
	cd $(FRONTEND) && pnpm vitest run
else
	@echo "frontend/ not set up yet (T-002); skipping frontend tests"
endif

lint: lint-backend lint-frontend

lint-backend:
	cd $(BACKEND) && uv run ruff check . && uv run ruff format --check . && uv run pyright

lint-frontend:
ifneq ($(HAS_FRONTEND),)
	cd $(FRONTEND) && pnpm eslint . && pnpm tsc --noEmit
else
	@echo "frontend/ not set up yet (T-002); skipping frontend lint"
endif

types:
ifneq ($(HAS_FRONTEND),)
	cd $(FRONTEND) && pnpm gen:api
else
	@echo "frontend/ not set up yet (T-002); nothing to generate"
endif

migrate:
	@test -f $(BACKEND)/alembic.ini || { echo "Alembic not configured yet (T-003)"; exit 1; }
	cd $(BACKEND) && uv run alembic upgrade head
