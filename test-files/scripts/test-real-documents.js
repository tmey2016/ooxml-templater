/**
 * Test Real Office Documents with Actual Data
 * Tests Word, Excel, and PowerPoint files with comprehensive data
 */

const OOXMLTemplater = require('../../src/index.js');
const AdmZip = require('adm-zip');
const fs = require('fs').promises;
const path = require('path');

// Capture warnings
const warnings = [];
const originalWarn = console.warn;
console.warn = function(...args) {
    warnings.push(args.join(' '));
    originalWarn.apply(console, args);
};

async function testWordDocument() {
    console.log('\n' + '='.repeat(80));
    console.log('TEST 1: WORD DOCUMENT (.docx)');
    console.log('='.repeat(80));

    const templater = new OOXMLTemplater();
    const templatePath = '../templates/test-template.docx';

    try {
        warnings.length = 0;

        // Step 1: Parse
        console.log('\n1. Parsing template...');
        const parseResult = await templater.parseTemplate(templatePath);

        if (!parseResult.success) {
            throw new Error('Parse failed: ' + parseResult.error.message);
        }

        console.log('   ✓ Found', parseResult.placeholders.unique.length, 'placeholders:');
        parseResult.placeholders.unique.forEach(p => console.log('     -', p));

        // Step 2: Provide real data
        console.log('\n2. Preparing data...');
        const data = {
            company: {
                name: 'Acme Corporation'
            },
            department: 'Sales & Marketing',
            report: {
                date: 'December 31, 2025'
            },
            author: {
                name: 'John Smith, VP of Sales'
            },
            summary: 'This quarter showed exceptional growth across all product lines. We exceeded our revenue targets by 15% and saw a 22% increase in customer acquisition. The team successfully launched three new products and expanded into two new markets.',
            metrics: {
                revenue: '2,450,000',
                units: '15,750',
                growth: '22.5',
                satisfaction: '9.2'
            }
        };

        console.log('   ✓ Data prepared for all', Object.keys(data).length, 'top-level keys');

        // Step 3: Substitute
        console.log('\n3. Substituting placeholders...');
        const substResult = await templater.substituteTemplate(templatePath, data);

        if (!substResult.success) {
            throw new Error('Substitution failed: ' + substResult.error.message);
        }

        console.log('   ✓ Substitution successful');
        console.log('     Total substitutions:', substResult.substitution.stats.totalSubstitutions);
        console.log('     Successful:', substResult.substitution.stats.successfulSubstitutions);
        console.log('     Failed:', substResult.substitution.stats.failedSubstitutions);

        // Step 4: Verify content
        console.log('\n4. Verifying output...');
        const outputZip = new AdmZip(substResult.document);
        const documentXml = outputZip.readAsText('word/document.xml');

        const checks = [
            { value: 'Acme Corporation', name: 'Company name' },
            { value: 'Sales &', name: 'Department' },  // & will be encoded as &amp; in XML
            { value: 'December 31, 2025', name: 'Report date' },
            { value: 'John Smith, VP of Sales', name: 'Author name' },
            { value: 'exceptional growth', name: 'Summary content' },
            { value: '2,450,000', name: 'Revenue' },
            { value: '15,750', name: 'Units sold' },
            { value: '22.5', name: 'Growth rate' },
            { value: '9.2', name: 'Satisfaction score' }
        ];

        let allFound = true;
        checks.forEach(check => {
            const found = documentXml.includes(check.value);
            console.log('     ' + (found ? '✓' : '✗'), check.name + ':', found ? 'Found' : 'MISSING');
            if (!found) allFound = false;
        });

        // Check no placeholders remain
        const hasPlaceholders = documentXml.match(/\(\(\([^)]+\)\)\)/);
        if (hasPlaceholders) {
            console.log('     ✗ WARNING: Unsubstituted placeholders found:', hasPlaceholders[0]);
            allFound = false;
        } else {
            console.log('     ✓ No unsubstituted placeholders');
        }

        // Step 5: Save
        console.log('\n5. Saving output...');
        const outputPath = '../outputs/output-word.docx';
        await templater.saveDocument(substResult.document, outputPath);
        console.log('   ✓ Saved to:', outputPath);

        // Check warnings
        const falseWarnings = warnings.filter(w => w.includes('Missing data'));
        if (falseWarnings.length > 0) {
            console.log('\n   ✗ FALSE WARNINGS DETECTED:', falseWarnings.length);
            falseWarnings.forEach(w => console.log('     -', w));
            return false;
        } else {
            console.log('\n   ✓ No false warnings');
        }

        if (allFound && substResult.substitution.stats.failedSubstitutions === 0) {
            console.log('\n✓✓✓ WORD DOCUMENT TEST PASSED ✓✓✓');
            return true;
        } else {
            console.log('\n✗✗✗ WORD DOCUMENT TEST FAILED ✗✗✗');
            return false;
        }

    } catch (error) {
        console.log('\n✗ ERROR:', error.message);
        console.error(error);
        return false;
    }
}

async function testExcelSpreadsheet() {
    console.log('\n' + '='.repeat(80));
    console.log('TEST 2: EXCEL SPREADSHEET (.xlsx)');
    console.log('='.repeat(80));

    const templater = new OOXMLTemplater();
    const templatePath = '../templates/test-template.xlsx';

    try {
        warnings.length = 0;

        // Step 1: Parse
        console.log('\n1. Parsing template...');
        const parseResult = await templater.parseTemplate(templatePath);

        if (!parseResult.success) {
            throw new Error('Parse failed: ' + parseResult.error.message);
        }

        console.log('   ✓ Found', parseResult.placeholders.unique.length, 'placeholders:');
        parseResult.placeholders.unique.forEach(p => console.log('     -', p));

        // Step 2: Provide real data
        console.log('\n2. Preparing data...');
        const data = {
            company: {
                name: 'Acme Corporation'
            },
            year: '2025',
            region: 'North America',
            product: {
                name: 'Widget Pro'
            }
        };

        console.log('   ✓ Data prepared');

        // Step 3: Substitute
        console.log('\n3. Substituting placeholders...');
        const substResult = await templater.substituteTemplate(templatePath, data);

        if (!substResult.success) {
            throw new Error('Substitution failed: ' + substResult.error.message);
        }

        console.log('   ✓ Substitution successful');
        console.log('     Total substitutions:', substResult.substitution.stats.totalSubstitutions);
        console.log('     Successful:', substResult.substitution.stats.successfulSubstitutions);
        console.log('     Failed:', substResult.substitution.stats.failedSubstitutions);

        // Step 4: Verify content
        console.log('\n4. Verifying output...');
        const outputZip = new AdmZip(substResult.document);
        const sharedStringsXml = outputZip.readAsText('xl/sharedStrings.xml');

        const checks = [
            { value: 'Acme Corporation', name: 'Company name' },
            { value: '2025', name: 'Year' },
            { value: 'North America', name: 'Region' },
            { value: 'Widget Pro', name: 'Product name' }
        ];

        let allFound = true;
        checks.forEach(check => {
            const found = sharedStringsXml.includes(check.value);
            console.log('     ' + (found ? '✓' : '✗'), check.name + ':', found ? 'Found' : 'MISSING');
            if (!found) allFound = false;
        });

        // Check no placeholders remain
        const hasPlaceholders = sharedStringsXml.match(/\(\(\([^)]+\)\)\)/);
        if (hasPlaceholders) {
            console.log('     ✗ WARNING: Unsubstituted placeholders found:', hasPlaceholders[0]);
            allFound = false;
        } else {
            console.log('     ✓ No unsubstituted placeholders');
        }

        // Verify numeric values are intact
        const worksheetXml = outputZip.readAsText('xl/worksheets/sheet1.xml');
        const numericCheck = ['25000', '30000', '28000', '35000', '118000'];
        console.log('\n   Checking numeric values in worksheet:');
        numericCheck.forEach(val => {
            const found = worksheetXml.includes(`<v>${val}</v>`);
            console.log('     ' + (found ? '✓' : '✗'), val + ':', found ? 'Found' : 'MISSING');
            if (!found) allFound = false;
        });

        // Step 5: Save
        console.log('\n5. Saving output...');
        const outputPath = '../outputs/output-excel.xlsx';
        await templater.saveDocument(substResult.document, outputPath);
        console.log('   ✓ Saved to:', outputPath);

        // Check warnings
        const falseWarnings = warnings.filter(w => w.includes('Missing data'));
        if (falseWarnings.length > 0) {
            console.log('\n   ✗ FALSE WARNINGS DETECTED:', falseWarnings.length);
            return false;
        } else {
            console.log('\n   ✓ No false warnings');
        }

        if (allFound && substResult.substitution.stats.failedSubstitutions === 0) {
            console.log('\n✓✓✓ EXCEL SPREADSHEET TEST PASSED ✓✓✓');
            return true;
        } else {
            console.log('\n✗✗✗ EXCEL SPREADSHEET TEST FAILED ✗✗✗');
            return false;
        }

    } catch (error) {
        console.log('\n✗ ERROR:', error.message);
        console.error(error);
        return false;
    }
}

async function testPowerPointPresentation() {
    console.log('\n' + '='.repeat(80));
    console.log('TEST 3: POWERPOINT PRESENTATION (.pptx) WITH CHART NUMERIC DIRECTIVES');
    console.log('='.repeat(80));

    const templater = new OOXMLTemplater();
    const templatePath = '../templates/test-template.pptx';

    try {
        warnings.length = 0;

        // Step 1: Parse
        console.log('\n1. Parsing template...');
        const parseResult = await templater.parseTemplate(templatePath);

        if (!parseResult.success) {
            throw new Error('Parse failed: ' + parseResult.error.message);
        }

        console.log('   ✓ Found', parseResult.placeholders.unique.length, 'placeholders');
        console.log('   ✓ Standard placeholders:', parseResult.placeholders.all.filter(p => p.type === 'standard').length);
        console.log('   ✓ Numeric directives:', parseResult.placeholders.numeric.length);

        parseResult.placeholders.numeric.forEach(d => {
            console.log('     - Directive:', d.rawPattern, '→ Replace', d.numericValue, 'with', d.cleanName);
        });

        // Step 2: Provide real data (including chart data)
        console.log('\n2. Preparing data...');
        const data = {
            presentation: {
                title: 'Q4 2025 Results',
                date: 'January 15, 2026'
            },
            company: {
                name: 'Acme Corporation'
            },
            quarter: 'Q4 2025',
            presenter: {
                name: 'Jane Doe, CFO'
            },
            // Chart data - these will replace the hardcoded numbers via numeric directives
            sales: {
                q1: 125000,  // Will replace 100000
                q2: 165000,  // Will replace 150000
                q3: 195000,  // Will replace 180000
                q4: 240000   // Will replace 220000
            }
        };

        console.log('   ✓ Data prepared with chart values:');
        console.log('     Q1:', data.sales.q1, '(replaces 100000)');
        console.log('     Q2:', data.sales.q2, '(replaces 150000)');
        console.log('     Q3:', data.sales.q3, '(replaces 180000)');
        console.log('     Q4:', data.sales.q4, '(replaces 220000)');

        // Step 3: Substitute
        console.log('\n3. Substituting placeholders and numeric directives...');
        const substResult = await templater.substituteTemplate(templatePath, data);

        if (!substResult.success) {
            throw new Error('Substitution failed: ' + substResult.error.message);
        }

        console.log('   ✓ Substitution successful');
        console.log('     Total substitutions:', substResult.substitution.stats.totalSubstitutions);
        console.log('     Successful:', substResult.substitution.stats.successfulSubstitutions);
        console.log('     Failed:', substResult.substitution.stats.failedSubstitutions);

        // Step 4: Verify content
        console.log('\n4. Verifying slide content...');
        const outputZip = new AdmZip(substResult.document);
        const slide1Xml = outputZip.readAsText('ppt/slides/slide1.xml');
        const slide2Xml = outputZip.readAsText('ppt/slides/slide2.xml');

        const textChecks = [
            { value: 'Q4 2025 Results', name: 'Presentation title', slide: 1 },
            { value: 'January 15, 2026', name: 'Presentation date', slide: 1 },
            { value: 'Acme Corporation', name: 'Company name', slide: 1 },
            { value: 'Q4 2025', name: 'Quarter', slide: 1 },
            { value: 'Jane Doe, CFO', name: 'Presenter name', slide: 1 }
        ];

        let allFound = true;
        textChecks.forEach(check => {
            const xml = check.slide === 1 ? slide1Xml : slide2Xml;
            const found = xml.includes(check.value);
            console.log('     ' + (found ? '✓' : '✗'), check.name + ':', found ? 'Found' : 'MISSING');
            if (!found) allFound = false;
        });

        // Verify numeric directives were removed from slide
        console.log('\n   Verifying numeric directives removed from slide:');
        const directivesRemoved = !slide2Xml.includes('(((100000=') &&
                                   !slide2Xml.includes('(((150000=') &&
                                   !slide2Xml.includes('(((180000=') &&
                                   !slide2Xml.includes('(((220000=');
        console.log('     ' + (directivesRemoved ? '✓' : '✗'), 'Numeric directives removed:', directivesRemoved ? 'Yes' : 'No');
        if (!directivesRemoved) allFound = false;

        // Step 5: Verify chart data
        console.log('\n5. Verifying chart numeric replacements...');
        const chartXml = outputZip.readAsText('ppt/charts/chart1.xml');

        const chartChecks = [
            { old: 100000, new: 125000, quarter: 'Q1' },
            { old: 150000, new: 165000, quarter: 'Q2' },
            { old: 180000, new: 195000, quarter: 'Q3' },
            { old: 220000, new: 240000, quarter: 'Q4' }
        ];

        chartChecks.forEach(check => {
            const hasNew = chartXml.includes(`<c:v>${check.new}</c:v>`);
            const hasOld = chartXml.includes(`<c:v>${check.old}</c:v>`);
            console.log('     ' + (hasNew ? '✓' : '✗'), check.quarter + ':', hasNew ? `${check.new} found` : `${check.new} MISSING`);
            if (!hasNew || hasOld) {
                console.log('       ' + (hasOld ? '✗' : ' '), hasOld ? `Old value ${check.old} still present!` : '');
                allFound = false;
            }
        });

        // Step 6: Save
        console.log('\n6. Saving output...');
        const outputPath = '../outputs/output-powerpoint.pptx';
        await templater.saveDocument(substResult.document, outputPath);
        console.log('   ✓ Saved to:', outputPath);

        // Check warnings
        const falseWarnings = warnings.filter(w =>
            w.includes('Missing data') &&
            !w.includes('not found in any XML') // This is acceptable for debugging
        );
        if (falseWarnings.length > 0) {
            console.log('\n   ✗ FALSE WARNINGS DETECTED:', falseWarnings.length);
            falseWarnings.forEach(w => console.log('     -', w));
            return false;
        } else {
            console.log('\n   ✓ No false warnings');
        }

        if (allFound && substResult.substitution.stats.failedSubstitutions === 0) {
            console.log('\n✓✓✓ POWERPOINT PRESENTATION TEST PASSED ✓✓✓');
            return true;
        } else {
            console.log('\n✗✗✗ POWERPOINT PRESENTATION TEST FAILED ✗✗✗');
            return false;
        }

    } catch (error) {
        console.log('\n✗ ERROR:', error.message);
        console.error(error);
        return false;
    }
}

async function verifyOutputFiles() {
    console.log('\n' + '='.repeat(80));
    console.log('VERIFICATION: OUTPUT FILE STRUCTURE');
    console.log('='.repeat(80));

    const files = [
        { path: '../outputs/output-word.docx', type: 'Word', mainFile: 'word/document.xml' },
        { path: '../outputs/output-excel.xlsx', type: 'Excel', mainFile: 'xl/workbook.xml' },
        { path: '../outputs/output-powerpoint.pptx', type: 'PowerPoint', mainFile: 'ppt/presentation.xml' }
    ];

    let allValid = true;

    for (const file of files) {
        try {
            console.log(`\n${file.type} Document (${file.path}):`);

            const stats = await fs.stat(file.path);
            console.log(`  ✓ File exists (${stats.size} bytes)`);

            const zip = new AdmZip(file.path);
            const entries = zip.getEntries();
            console.log(`  ✓ ZIP structure valid (${entries.length} files)`);

            const mainEntry = zip.getEntry(file.mainFile);
            if (mainEntry) {
                console.log(`  ✓ Main content file present: ${file.mainFile}`);
            } else {
                console.log(`  ✗ Main content file missing: ${file.mainFile}`);
                allValid = false;
            }

            const contentTypes = zip.getEntry('[Content_Types].xml');
            if (contentTypes) {
                console.log(`  ✓ Content types valid`);
            } else {
                console.log(`  ✗ Content types missing`);
                allValid = false;
            }

        } catch (error) {
            console.log(`  ✗ ERROR: ${error.message}`);
            allValid = false;
        }
    }

    return allValid;
}

async function main() {
    console.log('='.repeat(80));
    console.log('REAL OFFICE DOCUMENT TESTING WITH ACTUAL DATA');
    console.log('='.repeat(80));

    const results = {
        word: false,
        excel: false,
        powerpoint: false,
        verification: false
    };

    results.word = await testWordDocument();
    results.excel = await testExcelSpreadsheet();
    results.powerpoint = await testPowerPointPresentation();
    results.verification = await verifyOutputFiles();

    // Restore console.warn
    console.warn = originalWarn;

    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('FINAL TEST RESULTS');
    console.log('='.repeat(80));
    console.log();
    console.log('Test Results:');
    console.log('  1. Word Document (.docx):       ', results.word ? '✓ PASSED' : '✗ FAILED');
    console.log('  2. Excel Spreadsheet (.xlsx):  ', results.excel ? '✓ PASSED' : '✗ FAILED');
    console.log('  3. PowerPoint Presentation:    ', results.powerpoint ? '✓ PASSED' : '✗ FAILED');
    console.log('  4. File Verification:          ', results.verification ? '✓ PASSED' : '✗ FAILED');
    console.log();

    const allPassed = results.word && results.excel && results.powerpoint && results.verification;

    if (allPassed) {
        console.log('✓✓✓ ALL TESTS PASSED ✓✓✓');
        console.log();
        console.log('Output files created:');
        console.log('  - output-word.docx');
        console.log('  - output-excel.xlsx');
        console.log('  - output-powerpoint.pptx');
        console.log();
        console.log('You can open these files in Microsoft Office to verify results!');
    } else {
        console.log('✗✗✗ SOME TESTS FAILED ✗✗✗');
    }

    console.log('='.repeat(80));

    process.exit(allPassed ? 0 : 1);
}

main();
