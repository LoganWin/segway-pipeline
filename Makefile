.PHONY: setup dev dev-web test test-frontend lint lint-frontend types

FRONTEND := frontend
# T-002 frontend targets. Combine backend targets from T-001 when merging.
setup:
	cd $(FRONTEND) && pnpm install

dev: dev-web

dev-web:
	cd $(FRONTEND) && pnpm dev

test: test-frontend

test-frontend:
	cd $(FRONTEND) && pnpm test

lint: lint-frontend

lint-frontend:
	cd $(FRONTEND) && pnpm lint

types:
	cd $(FRONTEND) && pnpm gen:api
