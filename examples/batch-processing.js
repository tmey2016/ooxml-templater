/**
 * Batch Processing Example
 *
 * This example demonstrates how to process multiple documents efficiently
 * using template caching and batch operations.
 */

const OOXMLTemplater = require('../src/index');
const path = require('path');
const fs = require('fs').promises;

/**
 * Generate multiple invoices from a template
 */
async function generateInvoiceBatch() {
  // Initialize with caching enabled
  const templater = new OOXMLTemplater({
    cacheOptions: {
      maxSize: 50,
      ttl: 30 * 60 * 1000, // 30 minutes
      enableLRU: true
    }
  });

  const templatePath = path.join(__dirname, 'templates', 'invoice.docx');

  // Sample customer data
  const customers = [
    {
      invoiceNumber: 'INV-2024-001',
      customerName: 'Acme Corporation',
      customerAddress: '123 Business Ave, Suite 100, New York, NY 10001',
      items: [
        { description: 'Premium Service Package', quantity: 1, unitPrice: 2500, total: 2500 },
        { description: 'Support Hours', quantity: 10, unitPrice: 150, total: 1500 }
      ],
      subtotal: 4000,
      tax: 360,
      total: 4360,
      dueDate: '2024-12-31'
    },
    {
      invoiceNumber: 'INV-2024-002',
      customerName: 'Global Industries Inc.',
      customerAddress: '456 Commerce St, Los Angeles, CA 90001',
      items: [
        { description: 'Consulting Services', quantity: 1, unitPrice: 5000, total: 5000 },
        { description: 'Training Sessions', quantity: 3, unitPrice: 800, total: 2400 }
      ],
      subtotal: 7400,
      tax: 666,
      total: 8066,
      dueDate: '2024-12-31'
    },
    {
      invoiceNumber: 'INV-2024-003',
      customerName: 'TechStart LLC',
      customerAddress: '789 Innovation Dr, Austin, TX 78701',
      items: [
        { description: 'Software License', quantity: 5, unitPrice: 500, total: 2500 },
        { description: 'Implementation', quantity: 1, unitPrice: 1500, total: 1500 }
      ],
      subtotal: 4000,
      tax: 360,
      total: 4360,
      dueDate: '2024-12-31'
    }
  ];

  console.log(`Processing ${customers.length} invoices...`);

  const startTime = Date.now();
  const results = [];

  for (const customer of customers) {
    try {
      // Format items for template
      const data = {
        ...customer,
        itemsTable: customer.items.map((item, index) => ({
          lineNumber: index + 1,
          ...item
        })),
        issueDate: new Date().toLocaleDateString(),
        companyName: 'Your Company Name',
        companyAddress: '100 Main Street, City, State 12345'
      };

      // Process template (will use cache for 2nd+ iterations)
      const result = await templater.processTemplate(templatePath, data, {
        outputPath: path.join(__dirname, 'output', `${customer.invoiceNumber}.docx`)
      });

      if (result.success) {
        results.push({
          invoiceNumber: customer.invoiceNumber,
          customer: customer.customerName,
          success: true,
          path: result.output.path
        });
        console.log(`✓ ${customer.invoiceNumber} - ${customer.customerName}`);
      } else {
        results.push({
          invoiceNumber: customer.invoiceNumber,
          customer: customer.customerName,
          success: false,
          error: result.error.message
        });
        console.log(`✗ ${customer.invoiceNumber} - Error: ${result.error.message}`);
      }

    } catch (error) {
      console.error(`✗ ${customer.invoiceNumber} - Exception:`, error.message);
      results.push({
        invoiceNumber: customer.invoiceNumber,
        customer: customer.customerName,
        success: false,
        error: error.message
      });
    }
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Display cache statistics
  const cacheStats = templater.cache.getStats();

  console.log(`\n📊 Batch Processing Summary:`);
  console.log(`  - Total documents: ${customers.length}`);
  console.log(`  - Successful: ${results.filter(r => r.success).length}`);
  console.log(`  - Failed: ${results.filter(r => !r.success).length}`);
  console.log(`  - Duration: ${duration}ms (${(duration / customers.length).toFixed(0)}ms avg)`);
  console.log(`\n💾 Cache Performance:`);
  console.log(`  - Hit rate: ${cacheStats.hitRate}%`);
  console.log(`  - Hits: ${cacheStats.hits} / Misses: ${cacheStats.misses}`);
  console.log(`  - Memory usage: ${(cacheStats.memoryEstimate / 1024).toFixed(2)} KB`);

  return results;
}

/**
 * Generate reports with conditional content
 */
async function generateConditionalReports() {
  const templater = new OOXMLTemplater();

  const templatePath = path.join(__dirname, 'templates', 'report-with-optional-sections.docx');

  // Different report types with optional sections
  const reports = [
    {
      name: 'Full Report',
      data: {
        title: 'Q4 2024 Complete Analysis',
        executiveSummary: 'Strong performance across all metrics...',
        financialSection: 'Revenue increased by 25%...',
        marketingSection: 'Campaign ROI exceeded targets...',
        operationsSection: 'Efficiency improvements achieved...'
      }
    },
    {
      name: 'Executive Summary Only',
      data: {
        title: 'Q4 2024 Executive Brief',
        executiveSummary: 'Key highlights for executive review...',
        financialSection: '', // Empty - will delete this section
        marketingSection: '', // Empty - will delete this section
        operationsSection: '' // Empty - will delete this section
      }
    },
    {
      name: 'Financial Focus',
      data: {
        title: 'Q4 2024 Financial Report',
        executiveSummary: 'Financial overview...',
        financialSection: 'Detailed financial analysis...',
        marketingSection: null, // null - will delete this section
        operationsSection: undefined // undefined - will delete this section
      }
    }
  ];

  console.log('\nGenerating conditional reports...');

  for (const report of reports) {
    const result = await templater.processTemplate(templatePath, report.data, {
      outputPath: path.join(__dirname, 'output', `${report.name.replace(/\\s+/g, '-')}.docx`)
    });

    if (result.success) {
      const deleted = result.substitution.deletionResults;
      console.log(`✓ ${report.name}`);
      console.log(`  - Pages deleted: ${deleted.deletedPages || 0}`);
      console.log(`  - Sections removed: ${deleted.deletedSlides || 0}`);
    }
  }
}

/**
 * Process documents from API data
 */
async function processFromAPI() {
  const templater = new OOXMLTemplater();

  const templatePath = path.join(__dirname, 'templates', 'certificate.pptx');

  console.log('\nFetching participant data from API...');

  // Simulate API data fetch
  const participants = [
    { name: 'Alice Johnson', course: 'Advanced JavaScript', completionDate: '2024-12-15', score: 95 },
    { name: 'Bob Smith', course: 'Advanced JavaScript', completionDate: '2024-12-15', score: 88 },
    { name: 'Carol White', course: 'Advanced JavaScript', completionDate: '2024-12-15', score: 92 }
  ];

  console.log(`Processing ${participants.length} certificates...`);

  const promises = participants.map(async (participant) => {
    const data = {
      participantName: participant.name,
      courseName: participant.course,
      completionDate: participant.completionDate,
      score: participant.score,
      grade: participant.score >= 90 ? 'A' : participant.score >= 80 ? 'B' : 'C',
      issueDate: new Date().toLocaleDateString()
    };

    return templater.processTemplate(templatePath, data, {
      outputPath: path.join(__dirname, 'output', `certificate-${participant.name.replace(/\\s+/g, '-')}.pptx`)
    });
  });

  // Process all in parallel
  const results = await Promise.all(promises);

  console.log(`✓ Generated ${results.filter(r => r.success).length} certificates`);
}

// Run examples
if (require.main === module) {
  (async () => {
    await generateInvoiceBatch();
    await generateConditionalReports();
    await processFromAPI();
  })().catch(console.error);
}

module.exports = {
  generateInvoiceBatch,
  generateConditionalReports,
  processFromAPI
};
