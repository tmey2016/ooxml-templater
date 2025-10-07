const OOXMLTemplater = require('./src/index');
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs').promises;

async function testNumericDirectives() {
    // Create a test template with numeric directives
    const zip = new AdmZip();

    zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0"?><Types></Types>`));

    // Slide with numeric directive placeholders as text
    zip.addFile(
        'ppt/slides/slide1.xml',
        Buffer.from(`<?xml version="1.0"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>Chart directives: (((50000=data.q1))) (((75000=data.q2)))</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`)
    );

    // Chart with hardcoded numbers that should be replaced
    zip.addFile(
        'ppt/charts/chart1.xml',
        Buffer.from(`<?xml version="1.0"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
  <c:chart>
    <c:plotArea>
      <c:barChart>
        <c:ser>
          <c:val>
            <c:numRef>
              <c:numCache>
                <c:pt idx="0"><c:v>50000</c:v></c:pt>
                <c:pt idx="1"><c:v>75000</c:v></c:pt>
              </c:numCache>
            </c:numRef>
          </c:val>
        </c:ser>
      </c:barChart>
    </c:plotArea>
  </c:chart>
</c:chartSpace>`)
    );

    const templatePath = './test-numeric-temp.pptx';
    await fs.writeFile(templatePath, zip.toBuffer());

    console.log('=== Test: Numeric Directives ===\n');

    const templater = new OOXMLTemplater();

    // Parse
    const parseResult = await templater.parseTemplate(templatePath);
    console.log('1. PARSE RESULT:');
    console.log('   Numeric directives found:', parseResult.placeholders.numeric.length);
    parseResult.placeholders.numeric.forEach(d => {
        console.log(`   - ${d.rawPattern}: numericValue=${d.numericValue}, cleanName=${d.cleanName}`);
    });

    // Data
    const data = {
        data: {
            q1: 99999,
            q2: 88888
        }
    };
    console.log('\n2. DATA:');
    console.log('   data.q1 =', data.data.q1);
    console.log('   data.q2 =', data.data.q2);

    // Substitute
    console.log('\n3. SUBSTITUTION:');
    const result = await templater.substituteTemplate(templatePath, data);
    console.log('   Success:', result.success);
    console.log('   Stats:', result.substitution.stats);

    // Check output
    console.log('\n4. OUTPUT VERIFICATION:');
    const outputZip = new AdmZip(result.document);

    const slideXml = outputZip.readAsText('ppt/slides/slide1.xml');
    console.log('   Slide XML (directives should be removed):');
    console.log('   ', slideXml.includes('(((50000=data.q1)))') ? '✗ Still has directive' : '✓ Directive removed');
    console.log('   ', slideXml.includes('(((75000=data.q2)))') ? '✗ Still has directive' : '✓ Directive removed');

    const chartXml = outputZip.readAsText('ppt/charts/chart1.xml');
    console.log('\n   Chart XML (numbers should be replaced):');
    console.log('   ', chartXml.includes('<c:v>99999</c:v>') ? '✓ Has 99999' : '✗ Missing 99999');
    console.log('   ', chartXml.includes('<c:v>88888</c:v>') ? '✓ Has 88888' : '✗ Missing 88888');
    console.log('   ', chartXml.includes('<c:v>50000</c:v>') ? '✗ Still has 50000' : '✓ 50000 replaced');
    console.log('   ', chartXml.includes('<c:v>75000</c:v>') ? '✗ Still has 75000' : '✓ 75000 replaced');

    console.log('\n   Chart XML content:');
    console.log(chartXml);

    // Cleanup
    await fs.unlink(templatePath);

    if (chartXml.includes('99999') && chartXml.includes('88888') &&
        !chartXml.includes('<c:v>50000</c:v>') && !chartXml.includes('<c:v>75000</c:v>')) {
        console.log('\n✓✓✓ TEST PASSED ✓✓✓');
        return true;
    } else {
        console.log('\n✗✗✗ TEST FAILED ✗✗✗');
        return false;
    }
}

testNumericDirectives()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
        console.error('ERROR:', err);
        process.exit(1);
    });
