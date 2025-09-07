#!/bin/bash

# Script to test GitHub Actions workflows locally
# This simulates what the CI will do

set -e

echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to qlearn-lite directory
cd qlearn-lite

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm ci

echo -e "${YELLOW}🔨 Building TypeScript...${NC}"
npm run build

echo -e "${YELLOW}🔧 Fixing ES module imports...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' 's/from "\.\/\([^"]*\)"/from ".\/\1.js"/g' dist/*.js
else
    # Linux
    sed -i 's/from "\.\/\([^"]*\)"/from ".\/\1.js"/g' dist/*.js
fi

echo -e "${YELLOW}🧪 Running tests...${NC}"
npm test

echo -e "${YELLOW}📊 Running tests with coverage...${NC}"
npm run test:coverage

echo -e "${YELLOW}✅ Type checking...${NC}"
npx tsc --noEmit

echo -e "${YELLOW}🎯 Running integration test (train & export)...${NC}"
npm run example:export

# Check if files were created
if [ -f "qtable.json" ] && [ -f "qtable_grid.json" ]; then
    echo -e "${GREEN}✓ Q-table files generated successfully${NC}"
else
    echo -e "${RED}✗ Q-table files not found${NC}"
    exit 1
fi

# Check Python visualization if Python is available
if command -v python3 &> /dev/null; then
    echo -e "${YELLOW}🎨 Testing Python visualization...${NC}"
    cd ..
    if [ -f "requirements.txt" ]; then
        pip3 install -q -r requirements.txt 2>/dev/null || true
    fi
    cd qlearn-lite
    python3 ../visualize_qtable.py qtable_grid.json -o test_heatmap.png -r 4 -c 4
    if [ -f "test_heatmap.png" ]; then
        echo -e "${GREEN}✓ Visualization generated successfully${NC}"
        rm test_heatmap.png  # Clean up test file
    else
        echo -e "${YELLOW}⚠ Visualization test skipped (missing dependencies)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Python not found, skipping visualization test${NC}"
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ All local tests passed!${NC}"
echo -e "${GREEN}Your code is ready for GitHub Actions CI/CD${NC}"
echo -e "${GREEN}================================================${NC}"

# Display coverage summary
echo ""
echo "📊 Coverage Summary:"
if [ -f "coverage/lcov.info" ]; then
    grep -E "^SF:|^DA:" coverage/lcov.info | tail -5 || true
fi