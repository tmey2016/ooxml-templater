/**
 * Simple Document Generation Example
 *
 * This example demonstrates the basic workflow:
 * 1. Parse a template to find placeholders
 * 2. Provide data for those placeholders
 * 3. Generate the final document
 */

const OOXMLTemplater = require('../src/index');
const path = require('path');

async function generateSimpleDocument() {
  // Initialize the templater
  const templater = new OOXMLTemplater();

  // Path to your template file
  const templatePath = path.join(__dirname, 'templates', 'simple-letter.docx');

  // Data to fill in the template
  const data = {
    recipientName: 'John Doe',
    recipientAddress: '123 Main Street, New York, NY 10001',
    currentDate: new Date().toLocaleDateString(),
    subject: 'Welcome to OOXML Templater',
    bodyText: 'We are pleased to inform you that your account has been activated.',
    senderName: 'Jane Smith',
    senderTitle: 'Customer Success Manager'
  };

  try {
    // Method 1: Complete workflow in one call
    console.log('Generating document...');
    const result = await templater.processTemplate(templatePath, data, {
      outputPath: path.join(__dirname, 'output', 'welcome-letter.docx')
    });

    if (result.success) {
      console.log('✓ Document generated successfully!');
      console.log(`  - Placeholders substituted: ${result.substitution.stats.successfulSubstitutions}`);
      console.log(`  - Output: ${result.output.path}`);
    } else {
      console.error('✗ Error:', result.error.message);
    }

    // Method 2: Step-by-step workflow with more control
    console.log('\nAlternative: Step-by-step workflow...');

    // Step 1: Parse template
    const parseResult = await templater.parseTemplate(templatePath);
    console.log(`  Found ${parseResult.placeholders.count} placeholders`);
    console.log(`  Unique placeholders:`, parseResult.placeholders.unique);

    // Step 2: Substitute data
    const substResult = await templater.substituteTemplate(templatePath, data);
    console.log(`  Substituted ${substResult.stats.successfulSubstitutions} values`);

    // Step 3: Save document
    await templater.saveDocument(
      substResult.document,
      path.join(__dirname, 'output', 'welcome-letter-v2.docx')
    );
    console.log('  ✓ Saved to output/welcome-letter-v2.docx');

  } catch (error) {
    console.error('Error generating document:', error);
  }
}

// Run the example
if (require.main === module) {
  generateSimpleDocument().catch(console.error);
}

module.exports = generateSimpleDocument;
