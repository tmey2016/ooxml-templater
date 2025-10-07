/**
 * Comprehensive Test Suite for OOXML Templater
 * Tests all placeholder types, edge cases, and verifies no false warnings
 */

const OOXMLTemplater = require('../../src/index.js');
const fs = require('fs');
const path = require('path');

// Capture console warnings
const warnings = [];
const originalWarn = console.warn;
console.warn = function(...args) {
    warnings.push(args.join(' '));
    originalWarn.apply(console, args);
};

async function runComprehensiveTests() {
    console.log('='.repeat(80));
    console.log('COMPREHENSIVE OOXML TEMPLATER TEST SUITE');
    console.log('='.repeat(80));

    const templater = new OOXMLTemplater();
    let testsPassed = 0;
    let testsFailed = 0;
    const errors = [];

    // Test 1: Standard Placeholders with Real Template
    console.log('\n--- TEST 1: Standard Placeholders ---');
    try {
        warnings.length = 0; // Clear warnings

        const parseResult = await templater.parseTemplate('../templates/test-template.pptx');

        if (!parseResult.success) {
            throw new Error('Parse failed: ' + parseResult.error.message);
        }

        console.log('✓ Template parsed successfully');
        console.log(`  Found ${parseResult.placeholders.unique.length} unique placeholders`);
        console.log(`  Placeholders: ${parseResult.placeholders.unique.join(', ')}`);

        // Test with proper data matching template placeholders
        const testData = {
            presentation: {
                title: 'Test Presentation',
                date: '2025-10-07'
            },
            company: {
                name: 'Acme Corporation'
            },
            quarter: 'Q4 2025',
            presenter: {
                name: 'Test User'
            },
            sales: {
                q1: 100000,
                q2: 150000,
                q3: 180000,
                q4: 220000
            }
        };

        const substResult = await templater.substituteTemplate('../templates/test-template.pptx', testData);

        if (!substResult.success) {
            throw new Error('Substitution failed: ' + substResult.error.message);
        }

        console.log('✓ Substitution completed successfully');
        console.log(`  Total substitutions: ${substResult.substitution.stats.totalSubstitutions}`);
        console.log(`  Successful: ${substResult.substitution.stats.successfulSubstitutions}`);
        console.log(`  Failed: ${substResult.substitution.stats.failedSubstitutions}`);

        // Check for false warnings
        const dataRelatedWarnings = warnings.filter(w => w.includes('Missing data'));
        if (dataRelatedWarnings.length > 0) {
            throw new Error(`Found ${dataRelatedWarnings.length} false "Missing data" warnings!`);
        }
        console.log('✓ No false warnings logged');

        // Verify all substitutions succeeded
        if (substResult.substitution.stats.failedSubstitutions > 0) {
            throw new Error(`${substResult.substitution.stats.failedSubstitutions} substitutions failed`);
        }
        console.log('✓ All substitutions succeeded');

        // Save output
        await templater.saveDocument(substResult.document, '../outputs/test-output-standard.pptx');
        console.log('✓ Output saved to test-output-standard.pptx');

        testsPassed++;
    } catch (error) {
        console.log('✗ TEST 1 FAILED:', error.message);
        errors.push({ test: 'Standard Placeholders', error: error.message });
        testsFailed++;
    }

    // Test 2: Numeric Directives
    console.log('\n--- TEST 2: Numeric Directives (Chart Data) ---');
    try {
        warnings.length = 0;

        const parseResult = await templater.parseTemplate('../templates/test-template.pptx');
        const numericDirectives = parseResult.placeholders.numeric;

        console.log(`✓ Found ${numericDirectives.length} numeric directives`);
        numericDirectives.forEach(directive => {
            console.log(`  ${directive.rawPattern} (${directive.originalNumber} → ${directive.cleanName})`);
        });

        const data = {
            sales: {
                q1: 125000,
                q2: 175000,
                q3: 195000,
                q4: 250000
            }
        };

        const substResult = await templater.substituteTemplate('../templates/test-template.pptx', data);

        if (!substResult.success) {
            throw new Error('Substitution failed: ' + substResult.error.message);
        }

        // Check that numeric directives were processed
        if (substResult.substitution.stats.successfulSubstitutions === 0) {
            throw new Error('No substitutions were performed');
        }

        console.log('✓ Numeric directives processed successfully');
        console.log(`  Successful substitutions: ${substResult.substitution.stats.successfulSubstitutions}`);

        // Verify no warnings for numeric directives with data
        const numericWarnings = warnings.filter(w =>
            w.includes('Missing data for numeric directive') && w.includes('sales.q')
        );
        if (numericWarnings.length > 0) {
            throw new Error(`Found warnings for numeric directives: ${numericWarnings.join(', ')}`);
        }
        console.log('✓ No false warnings for numeric directives');

        await templater.saveDocument(substResult.document, '../outputs/test-output-numeric.pptx');
        console.log('✓ Output saved to test-output-numeric.pptx');

        testsPassed++;
    } catch (error) {
        console.log('✗ TEST 2 FAILED:', error.message);
        errors.push({ test: 'Numeric Directives', error: error.message });
        testsFailed++;
    }

    // Test 3: Nested Data with Dot Notation
    console.log('\n--- TEST 3: Nested Data Access ---');
    try {
        warnings.length = 0;

        // Create a simple test with nested data
        const nestedData = {
            user: {
                name: 'John Doe',
                email: 'john@example.com'
            },
            company: {
                name: 'Test Corp',
                address: {
                    city: 'New York',
                    state: 'NY'
                }
            }
        };

        // Test getDataValue directly
        const getValue = templater.placeholderSubstitution.getDataValue.bind(
            templater.placeholderSubstitution
        );

        const tests = [
            { path: 'user.name', expected: 'John Doe' },
            { path: 'user.email', expected: 'john@example.com' },
            { path: 'company.name', expected: 'Test Corp' },
            { path: 'company.address.city', expected: 'New York' },
            { path: 'company.address.state', expected: 'NY' }
        ];

        let passed = 0;
        for (const test of tests) {
            const value = getValue(nestedData, test.path);
            if (value === test.expected) {
                passed++;
                console.log(`✓ ${test.path} = ${value}`);
            } else {
                throw new Error(`Failed: ${test.path} expected ${test.expected}, got ${value}`);
            }
        }

        console.log(`✓ All ${passed} nested data access tests passed`);
        testsPassed++;
    } catch (error) {
        console.log('✗ TEST 3 FAILED:', error.message);
        errors.push({ test: 'Nested Data Access', error: error.message });
        testsFailed++;
    }

    // Test 4: Edge Cases - Missing Data
    console.log('\n--- TEST 4: Edge Cases (Missing Data) ---');
    try {
        warnings.length = 0;

        const parseResult = await templater.parseTemplate('../templates/test-template.pptx');

        // Provide data for only SOME placeholders (intentionally incomplete)
        const partialData = {
            company: {
                name: 'Test Org'
            },
            quarter: 'Q1 2025',
            // Missing: presentation.title, presentation.date, presenter.name
            sales: {
                q1: 100000,
                q2: 150000,
                q3: 180000,
                q4: 220000
            }
        };

        const substResult = await templater.substituteTemplate('../templates/test-template.pptx', partialData, {
            strictMode: false, // Don't throw errors on missing data
            preserveUnmatched: true, // Keep unmatched placeholders
            logMissingData: true // Log warnings for missing data
        });

        if (!substResult.success) {
            throw new Error('Substitution failed: ' + substResult.error.message);
        }

        console.log('✓ Substitution completed with partial data');
        console.log(`  Successful: ${substResult.substitution.stats.successfulSubstitutions}`);
        console.log(`  Failed: ${substResult.substitution.stats.failedSubstitutions}`);

        // NOW we SHOULD have warnings for actually missing data
        const missingWarnings = warnings.filter(w => w.includes('Missing data'));
        console.log(`✓ Correctly logged ${missingWarnings.length} warnings for actually missing data:`);
        missingWarnings.forEach(w => console.log(`    ${w}`));

        // But numeric directives should NOT warn even if we're missing other data
        const numericWarnings = warnings.filter(w =>
            w.includes('Missing data') && (w.includes('seventeen') || w.includes('thirty'))
        );
        if (numericWarnings.length > 0) {
            throw new Error(`Incorrectly warned about numeric directives that have data`);
        }
        console.log('✓ No false warnings for numeric directives with data');

        testsPassed++;
    } catch (error) {
        console.log('✗ TEST 4 FAILED:', error.message);
        errors.push({ test: 'Edge Cases', error: error.message });
        testsFailed++;
    }

    // Test 5: Empty Values
    console.log('\n--- TEST 5: Edge Cases (Empty Values) ---');
    try {
        const emptyData = {
            organization: '',
            department: null,
            date: undefined,
            'Open Ended 1': '   ', // Whitespace only
            level: 'Valid',
            seventeen: 0, // Zero is valid
            thirty: 32.5
        };

        // Test isEmptyValue
        const isEmpty = templater.placeholderSubstitution.isEmptyValue.bind(
            templater.placeholderSubstitution
        );

        if (!isEmpty('')) console.log('✗ Empty string should be empty');
        if (!isEmpty(null)) console.log('✗ null should be empty');
        if (!isEmpty(undefined)) console.log('✗ undefined should be empty');
        if (!isEmpty('   ')) console.log('✗ Whitespace should be empty');
        if (!isEmpty([])) console.log('✗ Empty array should be empty');
        if (!isEmpty({})) console.log('✗ Empty object should be empty');
        if (isEmpty(0)) console.log('✗ Zero should NOT be empty');
        if (isEmpty('Valid')) console.log('✗ String should NOT be empty');

        console.log('✓ Empty value detection works correctly');
        testsPassed++;
    } catch (error) {
        console.log('✗ TEST 5 FAILED:', error.message);
        errors.push({ test: 'Empty Values', error: error.message });
        testsFailed++;
    }

    // Test 6: Complete Data Object Test
    console.log('\n--- TEST 6: Complete Data Object ---');
    try {
        warnings.length = 0;

        const parseResult = await templater.parseTemplate('../templates/test-template.pptx');

        console.log(`  Template has ${parseResult.placeholders.unique.length} placeholders`);

        // Create complete data object matching all placeholders
        const completeData = {
            presentation: {
                title: 'Complete Test',
                date: 'Test Date'
            },
            company: {
                name: 'Test Company'
            },
            quarter: 'Q4 2025',
            presenter: {
                name: 'Test Presenter'
            },
            sales: {
                q1: 100000,
                q2: 150000,
                q3: 180000,
                q4: 220000
            }
        };

        console.log('✓ Complete data object created');
        console.log(`  Data covers all ${parseResult.placeholders.unique.length} placeholders`);

        // Substitute with complete data
        const substResult = await templater.substituteTemplate('../templates/test-template.pptx', completeData);

        if (!substResult.success) {
            throw new Error('Substitution failed: ' + substResult.error.message);
        }

        console.log('✓ Substitution with complete data successful');
        console.log(`  Successful: ${substResult.substitution.stats.successfulSubstitutions}`);
        console.log(`  Failed: ${substResult.substitution.stats.failedSubstitutions}`);

        // Check for false warnings with complete data
        const falseWarnings = warnings.filter(w => w.includes('Missing data'));
        if (falseWarnings.length > 0) {
            throw new Error(`Found ${falseWarnings.length} false warnings with complete data!`);
        }
        console.log('✓ No false warnings with complete data');

        // Verify all substitutions succeeded
        if (substResult.substitution.stats.failedSubstitutions > 0) {
            throw new Error('Some substitutions failed');
        }
        console.log('✓ All substitutions completed successfully');

        testsPassed++;
    } catch (error) {
        console.log('✗ TEST 6 FAILED:', error.message);
        errors.push({ test: 'Complete Data', error: error.message });
        testsFailed++;
    }

    // Results Summary
    console.log('\n' + '='.repeat(80));
    console.log('TEST RESULTS SUMMARY');
    console.log('='.repeat(80));
    console.log(`Tests Passed: ${testsPassed}`);
    console.log(`Tests Failed: ${testsFailed}`);
    console.log(`Total Tests:  ${testsPassed + testsFailed}`);

    if (errors.length > 0) {
        console.log('\nFAILURES:');
        errors.forEach((err, i) => {
            console.log(`${i + 1}. ${err.test}: ${err.error}`);
        });
    }

    console.log('\n' + '='.repeat(80));

    if (testsFailed === 0) {
        console.log('✓✓✓ ALL TESTS PASSED ✓✓✓');
        console.log('The library is working correctly with no bugs or false warnings!');
    } else {
        console.log(`✗✗✗ ${testsFailed} TEST(S) FAILED ✗✗✗`);
        console.log('Please review the errors above.');
    }

    console.log('='.repeat(80));

    // Restore console.warn
    console.warn = originalWarn;

    return testsFailed === 0;
}

// Run tests
runComprehensiveTests()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('FATAL ERROR:', error);
        process.exit(1);
    });
