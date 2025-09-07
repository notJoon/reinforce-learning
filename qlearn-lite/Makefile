# Makefile for qlearn-lite Q-learning library
# Usage: make [target]

# Variables
NODE = node
NPM = npm
PYTHON = python3
TSC = npx tsc

# Directories
SRC_DIR = src
DIST_DIR = dist
EXAMPLES_DIR = examples

# Output files
QTABLE_JSON = qtable.json
QTABLE_GRID_JSON = qtable_grid.json
HEATMAP_PNG = qtable_heatmap.png
HEATMAP_FULL_PNG = qtable_full_heatmap.png

# Default target
.PHONY: all
all: build

# Build TypeScript to JavaScript
.PHONY: build
build:
	@echo "Building TypeScript files..."
	$(NPM) run build
	@echo "Fixing ES module imports..."
	@sed -i '' 's/from "\.\/\([^"]*\)"/from ".\/\1.js"/g' $(DIST_DIR)/*.js
	@echo "Build complete!"

# Clean build artifacts
.PHONY: clean
clean:
	@echo "Cleaning build artifacts..."
	rm -rf $(DIST_DIR)
	rm -f $(QTABLE_JSON) $(QTABLE_GRID_JSON)
	rm -f $(HEATMAP_PNG) $(HEATMAP_FULL_PNG)
	@echo "Clean complete!"

# Install dependencies
.PHONY: install
install:
	@echo "Installing Node.js dependencies..."
	$(NPM) install
	@echo "Installing Python dependencies..."
	pip3 install -r ../requirements.txt
	@echo "Installation complete!"

# Run the Q-learning training and export example
.PHONY: train
train: build
	@echo "Training Q-learning agent and exporting Q-table..."
	$(NPM) run example:export
	@echo "Training complete! Q-table exported to $(QTABLE_JSON) and $(QTABLE_GRID_JSON)"

# Generate visualization from simplified grid
.PHONY: visualize
visualize: $(QTABLE_GRID_JSON)
	@echo "Generating Q-table heatmap visualization..."
	$(PYTHON) ../visualize_qtable.py $(QTABLE_GRID_JSON) -o $(HEATMAP_PNG) -r 4 -c 4
	@echo "Visualization saved to $(HEATMAP_PNG)"

# Generate visualization from full Q-table
.PHONY: visualize-full
visualize-full: $(QTABLE_JSON)
	@echo "Generating full Q-table heatmap visualization..."
	$(PYTHON) ../visualize_qtable.py $(QTABLE_JSON) -o $(HEATMAP_FULL_PNG) -r 4 -c 4
	@echo "Visualization saved to $(HEATMAP_FULL_PNG)"

# Run tests
.PHONY: test
test: build
	@echo "Running integration tests..."
	$(NPM) test
	@echo "Tests complete!"

# Run tests with coverage
.PHONY: test-coverage
test-coverage: build
	@echo "Running tests with coverage..."
	$(NPM) run test:coverage
	@echo "Coverage report generated!"

# Complete pipeline: build, train, and visualize
.PHONY: pipeline
pipeline: clean build test train visualize
	@echo "Complete pipeline finished!"
	@echo "Generated files:"
	@echo "  - $(QTABLE_JSON): Full Q-table data"
	@echo "  - $(QTABLE_GRID_JSON): Simplified grid data"
	@echo "  - $(HEATMAP_PNG): Q-table visualization"

# Quick run: train and visualize without rebuilding
.PHONY: quick
quick:
	@$(MAKE) train
	@$(MAKE) visualize

# Development mode: rebuild and run
.PHONY: dev
dev: clean pipeline

# Check if required tools are installed
.PHONY: check
check:
	@echo "Checking required tools..."
	@which $(NODE) > /dev/null && echo "✓ Node.js found: $$($(NODE) --version)" || echo "✗ Node.js not found"
	@which $(NPM) > /dev/null && echo "✓ npm found: $$($(NPM) --version)" || echo "✗ npm not found"
	@which $(PYTHON) > /dev/null && echo "✓ Python3 found: $$($(PYTHON) --version)" || echo "✗ Python3 not found"
	@which $(TSC) > /dev/null 2>&1 && echo "✓ TypeScript found: $$($(TSC) --version)" || echo "✗ TypeScript not found"
	@$(PYTHON) -c "import numpy" 2>/dev/null && echo "✓ NumPy installed" || echo "✗ NumPy not installed"
	@$(PYTHON) -c "import matplotlib" 2>/dev/null && echo "✓ Matplotlib installed" || echo "✗ Matplotlib not installed"

# Help target
.PHONY: help
help:
	@echo "qlearn-lite Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  make build         - Build TypeScript files to JavaScript"
	@echo "  make clean         - Remove build artifacts and generated files"
	@echo "  make install       - Install Node.js and Python dependencies"
	@echo "  make test          - Run integration tests"
	@echo "  make test-coverage - Run tests with coverage report"
	@echo "  make train         - Train Q-learning agent and export Q-table"
	@echo "  make visualize     - Generate heatmap from simplified grid data"
	@echo "  make visualize-full - Generate heatmap from full Q-table data"
	@echo "  make pipeline      - Run complete pipeline (clean, build, test, train, visualize)"
	@echo "  make quick         - Quick run (train and visualize without rebuild)"
	@echo "  make dev           - Development mode (clean and run pipeline)"
	@echo "  make check         - Check if required tools are installed"
	@echo "  make help          - Show this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make               - Build the project"
	@echo "  make pipeline      - Run everything from scratch"
	@echo "  make quick         - Train and visualize quickly"

# Ensure Q-table files exist before visualization
$(QTABLE_JSON) $(QTABLE_GRID_JSON):
	@echo "Q-table files not found. Running training first..."
	@$(MAKE) train

.DEFAULT_GOAL := help