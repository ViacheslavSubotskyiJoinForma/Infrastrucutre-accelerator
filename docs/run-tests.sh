#!/bin/bash
# Local testing script for validation functionality

set -e

echo "🧪 Infrastructure Accelerator - Validation Test Runner"
echo "======================================================="
echo ""

# Check if we're in the docs directory
if [ ! -f "test-validation.html" ]; then
    echo "❌ Error: test-validation.html not found"
    echo "Please run this script from the docs/ directory"
    exit 1
fi

# Find available port
PORT=8080
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; do
    PORT=$((PORT + 1))
done

echo "✅ Starting local web server on port $PORT..."
echo ""
echo "📝 Test URLs:"
echo "   Main app:  http://localhost:$PORT/index.html"
echo "   Test page: http://localhost:$PORT/test-validation.html"
echo ""
echo "📖 Instructions:"
echo "   1. Open the test page in your browser"
echo "   2. Click the test buttons to run automated tests"
echo "   3. Manually type in the fields to test input events"
echo ""
echo "💡 To stop the server, press Ctrl+C"
echo ""
echo "Starting server..."
echo "=================================================="
echo ""

# Start Python HTTP server based on version
if command -v python3 &> /dev/null; then
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer $PORT
else
    echo "❌ Error: Python not found"
    echo "Please install Python to run the local server"
    exit 1
fi
