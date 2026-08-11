PYTHON ?= python
PIP ?= pip
NODE ?= npm

.PHONY: backend-test frontend-test test coverage install-backend install-frontend

install-backend:
	$(PIP) install -r backend/requirements.txt pytest pytest-asyncio mongomock-motor httpx respx pytest-cov

install-frontend:
	$(NODE) install --prefix frontend
	$(NODE) install --prefix frontend -D vitest jsdom @testing-library/react @testing-library/jest-dom

backend-test:
	PYTHONPATH=. pytest backend/tests -q

frontend-test:
	$(NODE) --prefix frontend run test -- --run

test: backend-test frontend-test

coverage:
	PYTHONPATH=. pytest backend/tests --cov=backend/app --cov-report=term-missing
