# Test Files Directory

This directory contains all test-related files for the ooxml-templater library.

## Directory Structure

```
test-files/
├── templates/          # Template Office documents with placeholders
├── outputs/            # Generated output files from tests
├── scripts/            # Test scripts
└── reports/            # Test reports and documentation
```

## Templates (`templates/`)

Pre-built Office document templates with placeholders for testing:

- **`test-template.docx`** - Word document (Sales Report)
  - 9 placeholders: company info, dates, metrics, summaries

- **`test-template.xlsx`** - Excel spreadsheet (Sales Data)
  - 4 placeholders: company, year, region, product
  - Numeric data: Q1-Q4 sales figures

- **`test-template.pptx`** - PowerPoint presentation (Business Review)
  - 5 standard placeholders: title, company, quarter, presenter, date
  - 4 numeric directives for chart data: Q1-Q4 sales

## Outputs (`outputs/`)

Generated files from test runs:

- `output-word.docx` - Word document with substituted data
- `output-excel.xlsx` - Excel spreadsheet with substituted data
- `output-powerpoint.pptx` - PowerPoint with substituted text and chart data
- `output-debug.pptx` - Debug test output
- `test-output-*.pptx` - Additional test outputs

**Note**: These files are .gitignored and can be safely deleted. They will be regenerated when tests run.

## Scripts (`scripts/`)

Test scripts that can be run directly or via the convenience wrapper:

### Core Test Scripts

1. **`test-comprehensive.js`**
   - Comprehensive test suite covering all features
   - Tests: standard placeholders, numeric directives, nested data, edge cases, API integration
   - Run: `node run-tests.js comprehensive` (from project root)

2. **`test-real-documents.js`**
   - Tests with real Word, Excel, and PowerPoint files
   - Validates file structure and content
   - Run: `node run-tests.js real-docs`

3. **`test-debug.js`**
   - Debug test using test PowerPoint template
   - Tests data access and substitution
   - Run: `node run-tests.js debug`

4. **`create-real-templates.js`**
   - Creates test template documents programmatically
   - Generates all three template types
   - Run: `node run-tests.js create-templates`

5. **`test-numeric-debug.js`**
   - Focused test for numeric directive functionality
   - Tests chart data replacement
   - Run: `cd test-files/scripts && node test-numeric-debug.js`

### Running Tests

**From project root** (recommended):
```bash
# Show available tests
node run-tests.js help

# Run specific test
node run-tests.js comprehensive
node run-tests.js real-docs
node run-tests.js debug
node run-tests.js create-templates
```

**From scripts directory** (advanced):
```bash
cd test-files/scripts
node test-comprehensive.js
node test-real-documents.js
```

## Reports (`reports/`)

Documentation and test reports:

- **`BUGFIX-SUMMARY.md`** - Summary of bug fixes made to the library
- **`REAL-DOCUMENT-TEST-REPORT.md`** - Comprehensive real document testing report

## What Gets Tested

### ✅ Placeholder Types
- Simple placeholders: `(((name)))`
- Nested data: `(((company.name)))`
- Multi-level: `(((metrics.satisfaction)))`
- Numeric directives: `(((100000=sales.q1)))`

### ✅ Document Types
- Word documents (.docx)
- Excel spreadsheets (.xlsx)
- PowerPoint presentations (.pptx)

### ✅ Features
- Standard text substitution
- Numeric directive processing for charts
- Nested object access with dot notation
- Special character handling
- File integrity validation
- API data fetching

### ✅ Edge Cases
- Missing data (with proper warnings)
- Empty values
- Partial data
- Special characters (&, spaces, etc.)

## Test Coverage

All tests verify:
- ✓ No false warnings
- ✓ All substitutions successful
- ✓ Document structure preserved
- ✓ Output files valid and openable in Office applications
- ✓ Chart data updated correctly (for PowerPoint)
- ✓ ZIP file integrity

## Quick Start

1. **Create templates** (if not already present):
   ```bash
   node run-tests.js create-templates
   ```

2. **Run comprehensive tests**:
   ```bash
   node run-tests.js comprehensive
   ```

3. **Test with real documents**:
   ```bash
   node run-tests.js real-docs
   ```

4. **Check output files**:
   - Open files in `test-files/outputs/` with Microsoft Office
   - Verify all placeholders replaced with correct data
   - Verify charts show updated values

## Cleaning Up

To remove generated files:
```bash
# Remove all output files
rm test-files/outputs/*

# Remove and regenerate templates
rm test-files/templates/*
node run-tests.js create-templates
```

## Adding New Tests

1. Create new test script in `test-files/scripts/`
2. Use relative paths:
   - Templates: `../templates/`
   - Outputs: `../outputs/`
   - Source: `../../src/`
3. Add entry to `run-tests.js` in project root
4. Document in this README

## Notes

- All paths in scripts use relative references from the script location
- Templates are stored separately from outputs
- Output files are temporary and .gitignored
- Scripts can be run independently or via wrapper
- All test templates are self-contained in the test-files directory

---

*For more information, see the main project README and test reports in `test-files/reports/`.*
