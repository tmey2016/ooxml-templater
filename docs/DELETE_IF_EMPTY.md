# DeleteIfEmpty Directive

## Overview

The `DeleteIfEmpty` directive is an advanced feature that allows conditional removal of entire document sections (pages, slides, rows) based on whether placeholder data is empty.

## Syntax

```
(((DeletePageIfEmpty=placeholder.name)))
(((DeleteSlideIfEmpty=placeholder.name)))
(((DeleteRowIfEmpty=placeholder.name)))
```

## Supported Deletion Types

### 1. DeletePageIfEmpty (Word Documents)

Removes an entire page from a Word document if the specified placeholder value is empty.

**Example:**
```xml
<!-- Word document XML -->
<w:p>
  <w:r>
    <w:t>(((DeletePageIfEmpty=optionalSection)))</w:t>
  </w:r>
</w:p>
<w:p>
  <w:r>
    <w:t>This entire page will be removed if optionalSection is empty</w:t>
  </w:r>
</w:p>
```

**Data:**
```json
{
  "optionalSection": ""  // Empty - page will be deleted
}
```

### 2. DeleteSlideIfEmpty (PowerPoint Presentations)

Removes an entire slide from a PowerPoint presentation if the specified placeholder value is empty.

**Example:**
```xml
<!-- PowerPoint slide XML -->
<p:sld>
  <p:txBody>
    <a:p>
      <a:r>
        <a:t>(((DeleteSlideIfEmpty=slideContent)))</a:t>
      </a:r>
    </a:p>
  </p:txBody>
</p:sld>
```

**Data:**
```json
{
  "slideContent": null  // Null - slide will be deleted
}
```

### 3. DeleteRowIfEmpty (Excel Spreadsheets)

Removes an entire row from an Excel spreadsheet if the specified placeholder value is empty.

**Example:**
```xml
<!-- Excel worksheet XML -->
<row r="2">
  <c>
    <v>(((DeleteRowIfEmpty=optionalData)))</v>
  </c>
</row>
```

**Data:**
```json
{
  "optionalData": []  // Empty array - row will be deleted
}
```

## Empty Value Definition

A value is considered "empty" if it meets any of these conditions:

- `null`
- `undefined`
- Empty string: `""`
- String with only whitespace: `"   "`
- Empty array: `[]`
- Empty object: `{}`

**Non-empty values** (will NOT trigger deletion):

- `0` (zero)
- `false` (boolean)
- Non-empty strings
- Non-empty arrays
- Non-empty objects

## How It Works

### Detection Phase

1. During template parsing, the library detects `DeleteIfEmpty` directives
2. The directive type is inferred from:
   - The directive name (e.g., `DeletePageIfEmpty`)
   - The file type (e.g., Word, PowerPoint, Excel)
3. Directives are cataloged with their position and context

### Substitution Phase

1. The placeholder value is retrieved from the data object
2. The value is checked against empty criteria
3. If empty:
   - **Word**: Content between page breaks is removed
   - **PowerPoint**: The entire slide file is marked for deletion
   - **Excel**: The containing row element is removed
4. If not empty:
   - The directive is replaced with the actual value
   - The content remains in the document

## Usage Examples

### Example 1: Optional Contract Sections

```javascript
// Template has optional sections based on contract type
const data = {
  basicTerms: "Standard contract terms...",
  advancedTerms: "",  // Empty - page will be deleted
  executiveSummary: "Summary content...",
};

// Word document template:
// Page 1: (((basicTerms)))
// Page 2: (((DeletePageIfEmpty=advancedTerms))) Advanced Terms...
// Page 3: (((executiveSummary)))

// Result: 2-page document (Page 2 is removed)
```

### Example 2: Conditional Presentation Slides

```javascript
// Template has optional slides based on audience
const data = {
  introSlide: "Welcome to our presentation",
  technicalDetails: "Detailed technical information",
  executiveSummary: "",  // Empty - slide will be deleted
};

// PowerPoint template:
// Slide 1: (((introSlide)))
// Slide 2: (((technicalDetails)))
// Slide 3: (((DeleteSlideIfEmpty=executiveSummary)))

// Result: 2-slide presentation (Slide 3 is removed)
```

### Example 3: Dynamic Spreadsheet Rows

```javascript
// Template has optional data rows
const data = {
  row1Data: "Product A",
  row2Data: "Product B",
  row3Data: null,  // Empty - row will be deleted
  row4Data: "Product D",
};

// Excel template:
// Row 1: (((row1Data)))
// Row 2: (((row2Data)))
// Row 3: (((DeleteRowIfEmpty=row3Data)))
// Row 4: (((row4Data)))

// Result: 3 data rows (Row 3 is removed)
```

## Multiple Delete Directives

You can use multiple `DeleteIfEmpty` directives in the same document:

```javascript
const data = {
  section1: "Content",
  section2: "",      // Empty - deleted
  section3: "More content",
  section4: null,    // Empty - deleted
};

// Template with multiple directives will properly handle
// all deletions, keeping only sections 1 and 3
```

## Combining with Other Placeholder Types

`DeleteIfEmpty` directives work alongside other placeholder types:

```javascript
// Template can mix regular placeholders with delete directives
const data = {
  title: "Annual Report",
  year: 2023,
  optionalAppendix: "",  // Empty - page deleted
  chartValue: 42.5,      // Used in numeric directive
};

// Document will:
// 1. Replace (((title))) with "Annual Report"
// 2. Replace (((year))) with "2023"
// 3. Delete page with (((DeletePageIfEmpty=optionalAppendix)))
// 4. Update chart with (((12345=chartValue)))
```

## Edge Cases and Considerations

### Nested Data

```javascript
const data = {
  user: {
    profile: {
      bio: ""  // Empty
    }
  }
};

// Use dot notation in directive
// (((DeletePageIfEmpty=user.profile.bio)))
```

### Page Break Detection (Word)

The library detects page boundaries using:
- `<w:br w:type="page"/>` (explicit page breaks)
- `<w:sectPr>` (section breaks)

Content between these markers is considered a "page" for deletion purposes.

### Slide Deletion (PowerPoint)

When a slide is deleted:
- The entire slide XML file is marked for deletion
- The slide file content is emptied
- Presentation relationships should be updated accordingly

### Row Deletion (Excel)

When a row is deleted:
- The entire `<row>` element is removed
- Row numbers are NOT automatically adjusted
- This may create gaps in row numbering

## Error Handling

### Missing Data

If placeholder data is missing (undefined), it's treated as empty:

```javascript
const data = {
  // section1 is not defined
};

// (((DeletePageIfEmpty=section1))) will trigger deletion
```

### Invalid File Paths

If a delete directive is found in an unexpected file location, an error is logged but processing continues:

```javascript
// Error logged but won't crash:
// "Deletion error in invalid/path.xml (page): Could not determine boundaries"
```

## Configuration Options

The delete functionality can be configured via substitution options:

```javascript
const options = {
  deleteEmptyElements: true,  // Enable/disable delete directives (default: true)
  logMissingData: true,       // Log warnings for missing data (default: true)
  strictMode: false,          // Throw errors on missing data (default: false)
};

substitution.configure(options);
```

## Statistics

Deletion statistics are tracked and available after substitution:

```javascript
const result = substitution.substituteDocument(parseResult, data, xmlFiles);

console.log(result.stats.deletedElements);  // Number of deleted elements
// Includes pages, slides, and rows
```

## Best Practices

1. **Use Descriptive Names**: Use clear placeholder names that indicate the content type
   ```
   Good: (((DeletePageIfEmpty=contractAppendixA)))
   Bad:  (((DeletePageIfEmpty=x)))
   ```

2. **Test with Different Data**: Verify behavior with both empty and non-empty values

3. **Consider Document Flow**: Ensure remaining content flows logically after deletions

4. **Use Appropriate Types**: Match directive type to document type
   - `DeletePageIfEmpty` for Word documents
   - `DeleteSlideIfEmpty` for PowerPoint presentations
   - `DeleteRowIfEmpty` for Excel spreadsheets

5. **Handle Edge Cases**: Consider zero, false, and undefined values in your data design

## Limitations

1. **Page Detection**: Word page detection relies on explicit page breaks. Content without breaks may not delete as expected.

2. **Relationship Updates**: When slides are deleted, presentation relationships may need manual updates for complex scenarios.

3. **Row Numbering**: Excel row deletion doesn't automatically renumber subsequent rows.

4. **Nested Elements**: Very complex nested structures may require additional testing.

## Implementation Details

For developers extending this functionality:

- **Parser**: `PlaceholderParser` detects delete directives via regex patterns
- **Substitution**: `PlaceholderSubstitution` coordinates deletion processing
- **Deletion**: `ContentDeletion` class handles type-specific deletion logic
- **Tests**: See `test/unit/core/content-deletion.test.js` and `test/integration/delete-if-empty.test.js`

## See Also

- [Placeholder Syntax Guide](./PLACEHOLDER_SYNTAX.md)
- [API Reference](./API_REFERENCE.md)
- [Template Examples](./TEMPLATE_EXAMPLES.md)
