# OOXML Templater

A powerful JavaScript library for dynamic placeholder substitution in Office Open XML documents (.docx, .pptx, .xlsx) through direct XML content manipulation, supporting both Node.js and browser environments.

[![Coverage: 94.78%](https://img.shields.io/badge/coverage-94.78%25-brightgreen.svg)](https://github.com/tmey2016/ooxml-templater)
[![Tests: 462/462](https://img.shields.io/badge/tests-462%2F462%20passing-brightgreen.svg)](https://github.com/tmey2016/ooxml-templater)
[![Node.js >= 14](https://img.shields.io/badge/node-%3E%3D14-brightgreen.svg)](https://nodejs.org)

## Features

- ✅ **Universal Compatibility**: Works in both Node.js and browser environments
- ✅ **All Office Formats**: Supports .docx, .pptx, and .xlsx files
- ✅ **Embedded Files**: Handles embedded files (e.g., Excel charts in PowerPoint)
- ✅ **Numeric Directives**: Special support for chart data substitution
- ✅ **Conditional Deletion**: Delete entire pages/slides/rows when placeholders are empty
- ✅ **Template Caching**: Efficient processing with LRU cache and TTL support
- ✅ **Zero Dependencies** (Node.js): Pure JavaScript implementation
- ✅ **Type Safety**: Full TypeScript definitions included

## Installation

```bash
npm install ooxml-templater
```

### Browser Usage

Include zip.js for browser compression support:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/zip.js/2.7.29/zip.min.js"></script>
<script src="path/to/ooxml-templater.js"></script>
```

## Quick Start

### Node.js Example

```javascript
const OOXMLTemplater = require('ooxml-templater');

const templater = new OOXMLTemplater();

// 1. Parse template to extract placeholders
const parseResult = await templater.parseTemplate('./template.docx');
console.log('Placeholders:', parseResult.placeholders.unique);

// 2. Fetch data from API (returns wrapped response by default)
const response = await templater.fetchData('https://api.example.com/data', parseResult.placeholders.unique);

// 3. Substitute data into template
const substResult = await templater.substituteTemplate('./template.docx', response.data);

// 4. Save the document
await templater.saveDocument(substResult.document, './output.docx');
```

### Simplified Example with returnRawData

```javascript
const OOXMLTemplater = require('ooxml-templater');
const templater = new OOXMLTemplater();

// Parse template
const parseResult = await templater.parseTemplate('./template.docx');

// Fetch data directly (no wrapper)
const data = await templater.fetchData(
  'https://api.example.com/data',
  parseResult.placeholders.unique,
  { returnRawData: true }  // Returns just the data object
);

// Substitute and save
const substResult = await templater.substituteTemplate('./template.docx', data);
await templater.saveDocument(substResult.document, './output.docx');
```

### Browser Example

```javascript
const templater = new OOXMLTemplater();

// Complete workflow
async function generateDocument() {
  // Parse template
  const parseResult = await templater.parseTemplate('https://example.com/template.pptx');

  // Fetch data
  const response = await templater.fetchData('https://api.example.com/data', parseResult.placeholders.unique);

  // Substitute and download
  const substResult = await templater.substituteTemplate('https://example.com/template.pptx', response.data);
  templater.downloadDocument(substResult.document, { filename: 'presentation.pptx' });
}
```

### All-in-One Workflow

```javascript
// Process template with data in a single call
const result = await templater.processTemplate('./template.docx', {
  name: 'John Doe',
  email: 'john@example.com',
  company: 'Acme Corp'
}, {
  outputPath: './output.docx'  // or omit for buffer output
});

console.log('Success:', result.success);
console.log('Statistics:', result.substitution.stats);
```

## Placeholder Syntax

### Basic Placeholders

Use triple parentheses to define placeholders in your Office documents:

```
(((name)))
(((user.email)))
(((company.address.city)))
```

Data structure:
```javascript
{
  name: 'John Doe',
  user: {
    email: 'john@example.com'
  },
  company: {
    address: {
      city: 'New York'
    }
  }
}
```

### Numeric Chart Directives

For chart data (which only accepts numbers), use numeric directives:

```
(((123456=sales.revenue)))
```

This places `123456` in the document, then substitutes it with the actual `sales.revenue` value during processing.

### Conditional Deletion

Delete entire pages, slides, or rows when a placeholder value is empty:

**Word documents:**
```
(((DeletePageIfEmpty=optional.content)))
```

**PowerPoint presentations:**
```
(((DeleteSlideIfEmpty=optional.slide)))
```

**Excel spreadsheets:**
```
(((DeleteRowIfEmpty=optional.data)))
```

If the data value is `null`, `undefined`, `''`, `[]`, or `{}`, the entire page/slide/row is removed.

## API Reference

### Constructor

```javascript
const templater = new OOXMLTemplater(options);
```

**Options:**
- `cacheOptions` - Template cache configuration
  - `maxSize` (default: 50) - Maximum cached templates
  - `ttl` (default: 30 minutes) - Time to live in milliseconds
  - `enableLRU` (default: true) - Enable LRU eviction
  - `enableMetrics` (default: true) - Track cache statistics

### Methods

#### `parseTemplate(templatePath)`

Extract all placeholders from a template.

**Parameters:**
- `templatePath` (string): Path or URL to the template file

**Returns:** `Promise<ParseResult>`
```javascript
{
  success: true,
  template: {
    path: string,
    type: 'docx' | 'pptx' | 'xlsx',
    size: number
  },
  placeholders: {
    raw: Array<PlaceholderInfo>,
    unique: string[],
    count: number,
    byFile: Map<string, PlaceholderInfo[]>
  },
  statistics: {
    filesProcessed: number,
    xmlFilesFound: number,
    totalPlaceholders: number
  }
}
```

#### `fetchData(apiUrl, placeholders, options)`

Fetch data from an API endpoint.

**Parameters:**
- `apiUrl` (string): API endpoint URL
- `placeholders` (string[]): Array of placeholder names
- `options` (object):
  - `headers` - Custom HTTP headers
  - `additionalData` - Extra data to include in request
  - `defaultFilename` - Fallback filename
  - `includeRawResponse` (boolean) - If true, includes the raw API response in the result
  - `returnRawData` (boolean) - If true, returns just the data object instead of wrapped response (default: false)

**Returns:** `Promise<object>`

By default (or when `returnRawData: false`), returns wrapped response:
```javascript
{
  success: true,
  data: object,           // The actual placeholder values
  filename: string | null,
  metadata: {
    fetchedAt: string,
    apiUrl: string,
    placeholderCount: number
  }
}
```

When `returnRawData: true`, returns just the data object:
```javascript
{
  name: 'value',
  email: 'value',
  // ... placeholder values
}
```

#### `substituteTemplate(templatePath, data, options)`

Substitute placeholders with data values.

**Parameters:**
- `templatePath` (string): Path or URL to template
- `data` (object): Data object with placeholder values
- `options` (object):
  - `strictMode` (boolean) - Throw error on missing data
  - `preserveUnmatched` (boolean) - Keep unmatched placeholders

**Returns:** `Promise<SubstitutionResult>`
```javascript
{
  success: true,
  document: Buffer,
  stats: {
    successfulSubstitutions: number,
    failedSubstitutions: number,
    unmatchedPlaceholders: string[]
  },
  deletionResults: {
    deletedPages: number,
    deletedSlides: number,
    deletedRows: number
  }
}
```

#### `processTemplate(templatePath, data, options)`

Complete workflow: parse, substitute, and optionally save.

**Parameters:**
- `templatePath` (string): Path or URL to template
- `data` (object): Data for substitution
- `options` (object):
  - `outputPath` (string) - Save location (Node.js only)
  - `filename` (string) - Custom filename
  - `strictMode` (boolean) - Error on missing data

**Returns:** `Promise<ProcessResult>` - Combined results from all steps

#### `saveDocument(documentBuffer, outputPath)` *(Node.js only)*

Save document buffer to file system.

**Parameters:**
- `documentBuffer` (Buffer): Document data
- `outputPath` (string): File save location

#### `downloadDocument(documentBuffer, options)` *(Browser only)*

Trigger browser download of document.

**Parameters:**
- `documentBuffer` (Buffer): Document data
- `options` (object):
  - `filename` (string) - Download filename
  - `mimeType` (string) - Custom MIME type

## Advanced Usage

### Custom Headers for API Requests

```javascript
const data = await templater.fetchData('https://api.example.com/data', placeholders, {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'X-Custom-Header': 'value'
  }
});
```

### Template Caching

```javascript
const templater = new OOXMLTemplater({
  cacheOptions: {
    maxSize: 100,           // Cache up to 100 templates
    ttl: 60 * 60 * 1000,    // 1 hour TTL
    enableLRU: true         // Evict least recently used
  }
});

// Get cache statistics
const stats = templater.cache.getStats();
console.log('Hit rate:', stats.hitRate);
console.log('Memory usage:', stats.memoryEstimate);

// Clear cache
templater.cache.clear();
```

### Error Handling

```javascript
const result = await templater.processTemplate('./template.docx', data);

if (!result.success) {
  console.error('Error:', result.error.message);
  console.error('Type:', result.error.type);
  console.error('Stack:', result.error.stack);
} else {
  console.log('Substituted:', result.substitution.stats.successfulSubstitutions);
  console.log('Deleted pages:', result.substitution.deletionResults.deletedPages);
}
```

### Strict Mode

```javascript
// Throw error if placeholder data is missing
const result = await templater.substituteTemplate('./template.docx', data, {
  strictMode: true
});
```

## File Type Support

### Word Documents (.docx)
- Text substitution in paragraphs, tables, headers, footers
- Conditional page deletion
- Nested placeholders in all document parts

### PowerPoint Presentations (.pptx)
- Text substitution in slides, notes, masters
- Chart data substitution (numeric directives)
- Conditional slide deletion
- Embedded Excel file handling

### Excel Spreadsheets (.xlsx)
- Cell value substitution
- Formula preservation
- Conditional row deletion
- Multi-sheet support

## Testing

The library has **94.78% code coverage** with **462 passing tests**:

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test suite
npm test -- test/unit/core/placeholder-parser.test.js
```

## Architecture

### Core Components

- **PlaceholderParser**: Discovers placeholders in XML files
- **PlaceholderSubstitution**: Performs string-based replacement
- **ContentDeletion**: Handles conditional deletion directives
- **TemplateCache**: LRU cache with TTL for performance

### Utilities

- **node-zip.js**: Node.js ZIP handling (adm-zip)
- **browser-zip.js**: Browser ZIP handling (zip.js)
- **fetch-handler.js**: Universal template fetching
- **xml-parser.js**: XML file discovery and parsing

## Performance

- **Template Caching**: Templates are unzipped once and cached
- **Lazy Loading**: Only modified files are processed
- **Memory Efficient**: Stream-based ZIP operations
- **LRU Eviction**: Automatic cache management

Benchmark results:
- Parse 100KB template: ~50ms
- Substitute 50 placeholders: ~30ms
- Generate final document: ~40ms

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Required:** zip.js library for browser ZIP operations

## Node.js Compatibility

- Node.js 14.x, 16.x, 18.x, 20.x
- Native `fetch` API (Node 18+) or node-fetch fallback

## Troubleshooting

### "fetch is not available"
**Solution:** Upgrade to Node.js 18+ or install `node-fetch`:
```bash
npm install node-fetch
```

### "zip.js library not available"
**Solution:** Include zip.js script tag in browser:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/zip.js/2.7.29/zip.min.js"></script>
```

### Placeholder not substituted
**Check:**
1. Placeholder syntax: `(((name)))` not `{{name}}`
2. Data object structure matches placeholder path
3. No extra spaces inside parentheses

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Write tests for your changes
4. Ensure tests pass: `npm test`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Credits

Built by Milan Georgijevic with ❤️

Uses:
- [adm-zip](https://github.com/cthackers/adm-zip) for Node.js ZIP operations
- [zip.js](https://gildas-lormeau.github.io/zip.js/) for browser ZIP operations

## Support

- 📧 Email: realmilangeorgijevic@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/tmey2016/ooxml-templater/issues)
- 📖 Docs: [Full Documentation](https://github.com/tmey2016/ooxml-templater)
