#!/bin/bash
set -e

echo "Running CI validation..."

echo "1. Linting..."
npm run lint
echo "✓ Linting passed"

echo "2. Type checking..."
npm run typecheck
echo "✓ Type checking passed"

echo "3. Running tests..."
npm run test
echo "✓ Tests passed"

echo "4. Checking code coverage..."
npm run test:coverage -- --coverage
COVERAGE=$(npx vitest run --coverage 2>/dev/null | grep "All files" | awk '{print $4}' | tr -d '%')
if (( $(echo "$COVERAGE < 80" | bc -l) )); then
  echo "Coverage $COVERAGE% is below 80% threshold"
  exit 1
fi
echo "✓ Coverage check passed ($COVERAGE%)"

echo "5. Building..."
npm run build
echo "✓ Build succeeded"

echo "6. Verifying CLI..."
node dist/src/cli.js --version
echo "✓ CLI verification passed"

echo ""
echo "All CI checks passed!"