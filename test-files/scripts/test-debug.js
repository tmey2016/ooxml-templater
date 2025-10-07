async function debugTest() {
    const OOXMLTemplater = require('../../src/index.js');
    const templater = new OOXMLTemplater();

    console.log('\n=== STEP 1: Parse Template ===');
    const parseResult = await templater.parseTemplate('../templates/test-template.pptx');
    console.log('Parse Success:', parseResult.success);
    console.log('Unique Placeholders:', parseResult.placeholders.unique);

    console.log('\n=== STEP 2: Prepare Test Data ===');
    const data = {
        presentation: {
            title: 'Debug Test Presentation',
            date: 'January 15, 2026'
        },
        company: {
            name: 'Debug Test Corporation'
        },
        quarter: 'Q4 2025',
        presenter: {
            name: 'Test User'
        },
        sales: {
            q1: 125000,
            q2: 165000,
            q3: 195000,
            q4: 240000
        }
    };
    console.log('Data prepared for', Object.keys(data).length, 'top-level keys');

    console.log('\n=== STEP 3: Test Data Access ===');
    // Test the getDataValue function manually
    const testPlaceholders = ['presentation.title', 'company.name', 'sales.q1'];
    for (const placeholder of testPlaceholders) {
        const value = templater.placeholderSubstitution.getDataValue(data, placeholder);
        console.log(`getDataValue(data, "${placeholder}") =>`, value);
    }

    console.log('\n=== STEP 4: Substitute Template ===');
    const substResult = await templater.substituteTemplate('../templates/test-template.pptx', data);
    console.log('Substitution Success:', substResult.success);
    console.log('Stats:', substResult.substitution.stats);

    if (substResult.success) {
        console.log('\n=== STEP 5: Save Document ===');
        const saveResult = await templater.saveDocument(substResult.document, '../outputs/output-debug.pptx');
        console.log('Save Success:', saveResult.success);
        if (saveResult.success) {
            console.log('Saved to:', saveResult.path);
        }
    }
}

debugTest().catch(err => {
    console.error('Error:', err);
});
