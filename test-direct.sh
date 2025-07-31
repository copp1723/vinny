#!/bin/bash

echo "🧪 VinSolutions Direct Report Download Test"
echo "=========================================="
echo ""
echo "This test will:"
echo "1. Navigate directly to the report URL"
echo "2. Click the download button (#lbl_ExportArrow)"
echo "3. Select PDF from the dropdown (#lblExportPDF_rdPopupOptionItem)"
echo "4. Download the report"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Please create a .env file with:"
    echo "COX_USERNAME=your-username"
    echo "COX_PASSWORD=your-password"
    echo ""
fi

# Create downloads directory
mkdir -p downloads/direct-report-test
mkdir -p downloads/nl-report-test

# Run the test
npx ts-node test-direct-report.ts