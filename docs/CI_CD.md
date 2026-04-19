# CI/CD Integration Guide

This guide covers integrating mcp-contract-kit into your CI/CD pipeline.

## GitHub Actions

### Basic Conformance Check

```yaml
name: MCP Conformance

on: [push, pull_request]

jobs:
  conformance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install contract-kit
        run: npm ci && npm link

      - name: Start MCP server
        run: npm start &
        background: true

      - name: Wait for server
        run: sleep 5

      - name: Run conformance tests
        run: |
          mcp-contract-kit test http://localhost:8080 \
            --format json \
            --output conformance-report.json

      - name: Upload report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: conformance-report
          path: conformance-report.json

      - name: Fail on critical issues
        run: |
          CRITICAL=$(jq '.failures.critical' conformance-report.json)
          if [ "$CRITICAL" -gt "0" ]; then
            echo "Critical conformance issues found"
            exit 1
          fi
```

### Full CI Pipeline

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:ci
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: node dist/src/cli.js --help
```

### Release Pipeline

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm run test

  publish-npm:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci && npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  build-docker:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: mcp-contract-kit:${{ github.ref_name }}
```

---

## GitLab CI

```yaml
stages:
  - lint
  - test
  - build
  - deploy

lint:
  stage: lint
  image: node:22-alpine
  script:
    - npm ci
    - npm run lint

typecheck:
  stage: lint
  image: node:22-alpine
  script:
    - npm ci
    - npm run typecheck

test:
  stage: test
  image: node:22-alpine
  script:
    - npm ci
    - npm run test:ci
  coverage: '/All files.*\s+(\d+\.\d+)%/'

build:
  stage: build
  image: node:22-alpine
  script:
    - npm ci
    - npm run build
    - npm run test
  artifacts:
    paths:
      - dist/

deploy:
  stage: deploy
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t mcp-contract-kit:$CI_COMMIT_TAG .
    - docker push mcp-contract-kit:$CI_COMMIT_TAG
  only:
    - tags
```

---

## Jenkins Pipeline

```groovy
pipeline {
    agent any

    stages {
        stage('Lint') {
            steps {
                sh 'npm ci'
                sh 'npm run lint'
            }
        }

        stage('Type Check') {
            steps {
                sh 'npm run typecheck'
            }
        }

        stage('Test') {
            steps {
                sh 'npm run test:ci'
            }
            post {
                always {
                    junit 'coverage/junit.xml'
                }
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Docker Build & Push') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    docker build -t mcp-contract-kit:${GIT_COMMIT} .
                    docker push mcp-contract-kit:${GIT_COMMIT}
                '''
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
```

---

## Local Development

### Using the CI Validation Script

```bash
# Run all CI checks locally
./scripts/ci-validate.sh

# This performs:
# 1. Linting
# 2. Type checking
# 3. Tests
# 4. Coverage check (must be >= 80%)
# 5. Build verification
# 6. CLI verification
```

### Using Docker Compose

```bash
# Start mock MCP server and contract-kit
docker-compose up

# Run tests only
docker-compose up integration-test

# Stop services
docker-compose down
```

---

## Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/bash
# Run conformance tests before commit
npx mcp-contract-kit test http://localhost:8080 --fail-on critical

if [ $? -ne 0 ]; then
    echo "Conformance issues found. Please fix before committing."
    exit 1
fi
```

---

## Exit Codes Reference

| Code | Meaning |
|------|---------|
| 0 | All tests passed (or only info-level findings) |
| 1 | Critical failures found |
| 2 | Warning failures found (with `--fail-on warning`) |
| 3 | Test execution error (network, timeout, etc.) |