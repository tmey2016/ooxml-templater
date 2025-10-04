# OOXML Templater Examples

This directory contains practical examples demonstrating how to use the OOXML Templater library in various scenarios.

## Available Examples

### 1. Simple Document Generation (`simple-document-generation.js`)

Basic workflow for generating a single document from a template.

**Features demonstrated:**
- Parsing templates to find placeholders
- Providing data for substitution
- Generating and saving documents
- Both one-step and step-by-step workflows

**Run:**
```bash
node simple-document-generation.js
```

### 2. Chart Data Substitution (`chart-data-substitution.js`)

Working with PowerPoint charts and Excel dashboards using numeric directives.

**Features demonstrated:**
- Numeric directives for chart data (e.g., `(((123456=sales.revenue)))`)
- Substituting data in embedded Excel charts
- Processing PowerPoint presentations
- Generating Excel dashboards

**Run:**
```bash
node chart-data-substitution.js
```

### 3. Batch Processing (`batch-processing.js`)

Efficiently processing multiple documents with template caching.

**Features demonstrated:**
- Batch invoice generation
- Template caching for performance
- Conditional content deletion
- Processing documents from API data
- Parallel processing with Promise.all()
- Cache statistics and performance metrics

**Run:**
```bash
node batch-processing.js
```

### 4. Browser Usage (`browser-usage.html`)

Interactive browser-based document generation.

**Features demonstrated:**
- File upload and processing in browser
- Fetching templates from URLs
- API integration for data
- Batch processing in browser
- Download generated documents

**Run:**
Open `browser-usage.html` in a web browser.

**Requirements:**
- zip.js library (included via CDN)
- Modern browser with FileReader API support

## Template Requirements

These examples expect template files in the `templates/` directory:

- `simple-letter.docx` - Basic letter template
- `sales-report.pptx` - Presentation with charts
- `dashboard.xlsx` - Excel dashboard
- `invoice.docx` - Invoice template
- `report-with-optional-sections.docx` - Report with conditional sections
- `certificate.pptx` - Certificate template

### Sample Template Placeholders

**Simple Letter:**
```
(((recipientName)))
(((recipientAddress)))
(((currentDate)))
(((subject)))
(((bodyText)))
(((senderName)))
(((senderTitle)))
```

**Sales Report (with numeric directives):**
```
(((reportDate)))
(((companyName)))
(((fiscalYear)))
(((123456=sales.q1Revenue)))
(((234567=sales.q2Revenue)))
(((345678=sales.q3Revenue)))
(((456789=sales.q4Revenue)))
```

**Invoice:**
```
(((invoiceNumber)))
(((customerName)))
(((customerAddress)))
(((issueDate)))
(((dueDate)))
(((subtotal)))
(((tax)))
(((total)))
```

## Output

Generated documents are saved to the `output/` directory.

## Error Handling

All examples include comprehensive error handling:

```javascript
const result = await templater.processTemplate(templatePath, data);

if (!result.success) {
  console.error('Error:', result.error.message);
  console.error('Type:', result.error.type);
} else {
  console.log('Success:', result.output.path);
}
```

## Advanced Features

### Template Caching

```javascript
const templater = new OOXMLTemplater({
  cacheOptions: {
    maxSize: 50,
    ttl: 30 * 60 * 1000, // 30 minutes
    enableLRU: true
  }
});

// Get cache statistics
const stats = templater.cache.getStats();
console.log('Cache hit rate:', stats.hitRate);
```

### Conditional Content

Use `DeletePageIfEmpty`, `DeleteSlideIfEmpty`, or `DeleteRowIfEmpty` directives:

```
(((DeletePageIfEmpty=optional.content)))
```

If `optional.content` is empty, the entire page/slide/row is removed.

## Browser Deployment

To deploy the browser example:

1. Build the browser bundle:
```bash
npm run build:browser
```

2. Include required scripts:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/zip.js/2.7.29/zip.min.js"></script>
<script src="dist/ooxml-templater.js"></script>
```

3. Initialize and use:
```javascript
const templater = new OOXMLTemplater();
// ... use templater
```

## Troubleshooting

### "fetch is not available"
**Solution:** Use Node.js 18+ or install node-fetch

### "zip.js library not available"
**Solution:** Include zip.js in your HTML:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/zip.js/2.7.29/zip.min.js"></script>
```

### Template not found
**Solution:** Ensure templates exist in `examples/templates/` directory

## Next Steps

1. Create your own templates with placeholders
2. Customize the examples for your use case
3. Integrate with your application's data sources
4. Deploy to production with appropriate error handling

## Support

For more information, see the main [README.md](../README.md) or open an issue on GitHub.
