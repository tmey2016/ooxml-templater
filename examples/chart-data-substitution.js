/**
 * Chart Data Substitution Example
 *
 * This example shows how to use numeric directives to substitute
 * chart data in PowerPoint presentations or Excel spreadsheets.
 *
 * Charts only accept numeric values, so we use special directives
 * like (((123456=sales.revenue))) which places 123456 in the template
 * and then substitutes it with the actual value.
 */

const OOXMLTemplater = require('../src/index');
const path = require('path');

async function generateChartPresentation() {
  const templater = new OOXMLTemplater();

  // Template with embedded Excel chart
  const templatePath = path.join(__dirname, 'templates', 'sales-report.pptx');

  // Sales data - note: chart values must be numbers
  const data = {
    sales: {
      q1Revenue: 125000,
      q2Revenue: 148000,
      q3Revenue: 167000,
      q4Revenue: 192000,
      totalRevenue: 632000
    },
    growth: {
      yearOverYear: 23.5,
      targetAchievement: 105.2
    },
    reportDate: new Date().toLocaleDateString(),
    companyName: 'Acme Corporation',
    fiscalYear: new Date().getFullYear()
  };

  try {
    console.log('Generating sales presentation with chart data...');

    // Parse to see what placeholders exist
    const parseResult = await templater.parseTemplate(templatePath);
    console.log('\nPlaceholders found:');
    parseResult.placeholders.unique.forEach(p => {
      console.log(`  - ${p}`);
    });

    // Check for numeric directives
    const numericDirectives = parseResult.placeholders.raw.filter(p =>
      p.directive && p.directive.includes('=')
    );

    if (numericDirectives.length > 0) {
      console.log('\nNumeric chart directives:');
      numericDirectives.forEach(d => {
        console.log(`  - ${d.directive} (in ${d.position.file})`);
      });
    }

    // Generate the presentation
    const result = await templater.processTemplate(templatePath, data, {
      outputPath: path.join(__dirname, 'output', 'sales-report-2024.pptx')
    });

    if (result.success) {
      console.log('\n✓ Presentation generated successfully!');
      console.log(`  - Slides processed: ${result.parsing.statistics.filesProcessed}`);
      console.log(`  - Values substituted: ${result.substitution.stats.successfulSubstitutions}`);
      console.log(`  - Output: ${result.output.path}`);

      // Display statistics
      if (result.substitution.stats.unmatchedPlaceholders.length > 0) {
        console.log('\n⚠ Unmatched placeholders:');
        result.substitution.stats.unmatchedPlaceholders.forEach(p => {
          console.log(`  - ${p}`);
        });
      }
    } else {
      console.error('✗ Error:', result.error.message);
    }

  } catch (error) {
    console.error('Error generating presentation:', error);
  }
}

/**
 * Example: Excel with chart
 */
async function generateExcelWithChart() {
  const templater = new OOXMLTemplater();

  const templatePath = path.join(__dirname, 'templates', 'dashboard.xlsx');

  // Dashboard metrics
  const data = {
    metrics: {
      totalSales: 1250000,
      totalOrders: 3450,
      avgOrderValue: 362.32,
      conversionRate: 3.8,
      customerCount: 12500,
      returnRate: 2.1
    },
    trends: {
      salesGrowth: 18.5,
      orderGrowth: 22.3,
      customerGrowth: 15.7
    },
    reportMonth: 'December 2024',
    updatedAt: new Date().toISOString()
  };

  try {
    console.log('\nGenerating Excel dashboard with charts...');

    const result = await templater.processTemplate(templatePath, data, {
      outputPath: path.join(__dirname, 'output', 'dashboard-dec-2024.xlsx')
    });

    if (result.success) {
      console.log('✓ Excel dashboard generated!');
      console.log(`  - Output: ${result.output.path}`);
    }

  } catch (error) {
    console.error('Error generating dashboard:', error);
  }
}

// Run examples
if (require.main === module) {
  (async () => {
    await generateChartPresentation();
    await generateExcelWithChart();
  })().catch(console.error);
}

module.exports = { generateChartPresentation, generateExcelWithChart };
