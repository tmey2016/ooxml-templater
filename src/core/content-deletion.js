/**
 * Content Deletion Handler
 * Handles deletion of pages, slides, and other structural elements based on DeleteIfEmpty directives
 */

/**
 * ContentDeletion class for removing empty content sections
 */
class ContentDeletion {
  constructor() {
    // Document type handlers
    this.handlers = {
      word: this.deleteWordPage.bind(this),
      powerpoint: this.deletePowerPointSlide.bind(this),
      excel: this.deleteExcelRow.bind(this),
    };
  }

  /**
   * Process delete directives and remove empty content
   * @param {Array} deleteDirectives - Array of delete directive placeholders
   * @param {Object} data - Data object
   * @param {Map} modifiedFiles - Map of modified files
   * @param {Object} extractedZip - Extracted ZIP structure
   * @returns {Object} Deletion result
   */
  processDeleteDirectives(deleteDirectives, data, modifiedFiles, _extractedZip) {
    const deletionResults = {
      deletedPages: [],
      deletedSlides: [],
      deletedRows: [],
      modifiedFiles: new Map(modifiedFiles),
      success: true,
      errors: [],
    };

    // Group directives by type and file
    const groupedDirectives = this.groupDirectivesByType(deleteDirectives, data);

    // Process deletions by type
    if (groupedDirectives.pages.length > 0) {
      this.processPageDeletions(groupedDirectives.pages, deletionResults);
    }

    if (groupedDirectives.slides.length > 0) {
      this.processSlideDeletions(groupedDirectives.slides, deletionResults);
    }

    if (groupedDirectives.rows.length > 0) {
      this.processRowDeletions(groupedDirectives.rows, deletionResults);
    }

    return deletionResults;
  }

  /**
   * Group delete directives by type
   * @param {Array} deleteDirectives - Array of delete directives
   * @param {Object} data - Data object
   * @returns {Object} Grouped directives
   */
  groupDirectivesByType(deleteDirectives, data) {
    const grouped = {
      pages: [],
      slides: [],
      rows: [],
      sections: [],
    };

    for (const directive of deleteDirectives) {
      const conditionValue = this.getDataValue(data, directive.cleanName);
      if (this.isEmptyValue(conditionValue)) {
        const deleteType = directive.deleteType || this.inferDeleteType(directive);

        switch (deleteType) {
          case 'page':
            grouped.pages.push(directive);
            break;
          case 'slide':
            grouped.slides.push(directive);
            break;
          case 'row':
            grouped.rows.push(directive);
            break;
          case 'section':
            grouped.sections.push(directive);
            break;
        }
      }
    }

    return grouped;
  }

  /**
   * Infer delete type from directive information
   * @param {Object} directive - Delete directive
   * @returns {string} Delete type
   */
  inferDeleteType(directive) {
    const fileType = directive.position?.fileType;
    const directiveName = directive.directive?.toLowerCase() || '';

    if (directiveName.includes('page') || fileType === 'word') {
      return 'page';
    } else if (directiveName.includes('slide') || fileType === 'powerpoint') {
      return 'slide';
    } else if (directiveName.includes('row') || fileType === 'excel') {
      return 'row';
    }

    return 'unknown';
  }

  /**
   * Process page deletions for Word documents
   * @param {Array} pageDirectives - Page delete directives
   * @param {Object} results - Results object to update
   */
  processPageDeletions(pageDirectives, results) {
    // Group by file
    const fileGroups = this.groupByFile(pageDirectives);

    for (const [filePath, directives] of fileGroups) {
      try {
        const file = results.modifiedFiles.get(filePath);
        if (!file) {
          continue;
        }

        const deletionResult = this.deleteWordPage(file, directives);
        if (deletionResult.success) {
          results.modifiedFiles.set(filePath, deletionResult.modifiedFile);
          results.deletedPages.push(...deletionResult.deletedPages);
        } else {
          results.errors.push({
            file: filePath,
            type: 'page',
            error: deletionResult.error,
          });
        }
      } catch (error) {
        results.success = false;
        results.errors.push({
          file: filePath,
          type: 'page',
          error: error.message,
        });
      }
    }
  }

  /**
   * Process slide deletions for PowerPoint presentations
   * @param {Array} slideDirectives - Slide delete directives
   * @param {Object} results - Results object to update
   */
  processSlideDeletions(slideDirectives, results) {
    // Group by file (slide file)
    const fileGroups = this.groupByFile(slideDirectives);

    for (const [filePath, directives] of fileGroups) {
      try {
        const file = results.modifiedFiles.get(filePath);
        if (!file) {
          continue;
        }

        const deletionResult = this.deletePowerPointSlide(file, directives);
        if (deletionResult.success) {
          results.modifiedFiles.set(filePath, deletionResult.modifiedFile);
          results.deletedSlides.push(...deletionResult.deletedSlides);
        } else {
          results.errors.push({
            file: filePath,
            type: 'slide',
            error: deletionResult.error,
          });
        }
      } catch (error) {
        results.success = false;
        results.errors.push({
          file: filePath,
          type: 'slide',
          error: error.message,
        });
      }
    }
  }

  /**
   * Process row deletions for Excel spreadsheets
   * @param {Array} rowDirectives - Row delete directives
   * @param {Object} results - Results object to update
   */
  processRowDeletions(rowDirectives, results) {
    // Group by file
    const fileGroups = this.groupByFile(rowDirectives);

    for (const [filePath, directives] of fileGroups) {
      try {
        const file = results.modifiedFiles.get(filePath);
        if (!file) {
          continue;
        }

        const deletionResult = this.deleteExcelRow(file, directives);
        if (deletionResult.success) {
          results.modifiedFiles.set(filePath, deletionResult.modifiedFile);
          results.deletedRows.push(...deletionResult.deletedRows);
        } else {
          results.errors.push({
            file: filePath,
            type: 'row',
            error: deletionResult.error,
          });
        }
      } catch (error) {
        results.success = false;
        results.errors.push({
          file: filePath,
          type: 'row',
          error: error.message,
        });
      }
    }
  }

  /**
   * Delete a page from a Word document
   * @param {Object} file - Word document file object
   * @param {Array} directives - Delete directives for this file
   * @returns {Object} Deletion result
   */
  deleteWordPage(file, directives) {
    try {
      let modifiedContent = file.content;
      const deletedPages = [];

      // Find page breaks and section breaks in Word XML
      // Word documents use <w:br w:type="page"/> for page breaks
      // and various section properties for sections

      for (const directive of directives) {
        const pageInfo = this.findPageBoundaries(modifiedContent, directive.position.index);
        if (pageInfo.found) {
          // Remove content from page start to page end
          const beforePage = modifiedContent.slice(0, pageInfo.start);
          const afterPage = modifiedContent.slice(pageInfo.end);
          modifiedContent = beforePage + afterPage;

          deletedPages.push({
            directive: directive.cleanName,
            startIndex: pageInfo.start,
            endIndex: pageInfo.end,
            pageNumber: pageInfo.pageNumber,
          });
        }
      }

      return {
        success: true,
        modifiedFile: {
          ...file,
          content: modifiedContent,
          modified: true,
        },
        deletedPages,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        modifiedFile: file,
        deletedPages: [],
      };
    }
  }

  /**
   * Find page boundaries in Word document XML
   * @param {string} content - XML content
   * @param {number} directivePosition - Position of delete directive
   * @returns {Object} Page boundary information
   */
  findPageBoundaries(content, directivePosition) {
    // Find the containing paragraph or section
    // Look for <w:p> (paragraph) or <w:sectPr> (section properties)

    // Strategy: Find the enclosing paragraph, then look for page breaks before and after
    const paragraphStart = this.findContainingElement(content, directivePosition, 'w:p');
    if (!paragraphStart) {
      return { found: false };
    }

    // Find page break before this position
    const pageBreakBefore = this.findPageBreakBefore(content, paragraphStart.start);

    // Find page break after this position
    const pageBreakAfter = this.findPageBreakAfter(content, paragraphStart.end);

    // Determine page boundaries
    const pageStart = pageBreakBefore ? pageBreakBefore.end : 0;
    const pageEnd = pageBreakAfter ? pageBreakAfter.start : content.length;

    return {
      found: true,
      start: pageStart,
      end: pageEnd,
      pageNumber: this.estimatePageNumber(content, pageStart),
    };
  }

  /**
   * Find containing XML element
   * @param {string} content - XML content
   * @param {number} position - Position within content
   * @param {string} elementName - Element name to find
   * @returns {Object|null} Element boundaries or null
   */
  findContainingElement(content, position, elementName) {
    // Search backwards for opening tag
    const openingTagRegex = new RegExp(`<${elementName}[^>]*>`, 'g');
    const closingTagRegex = new RegExp(`</${elementName}>`, 'g');

    let openingMatch;
    let lastOpening = null;

    while ((openingMatch = openingTagRegex.exec(content)) !== null) {
      if (openingMatch.index > position) {
        break;
      }
      lastOpening = openingMatch;
    }

    if (!lastOpening) {
      return null;
    }

    // Find corresponding closing tag
    closingTagRegex.lastIndex = lastOpening.index;
    const closingMatch = closingTagRegex.exec(content);

    if (!closingMatch) {
      return null;
    }

    return {
      start: lastOpening.index,
      end: closingMatch.index + closingMatch[0].length,
      elementName,
    };
  }

  /**
   * Find page break before a position
   * @param {string} content - XML content
   * @param {number} position - Position to search before
   * @returns {Object|null} Page break info or null
   */
  findPageBreakBefore(content, position) {
    // Look for page break patterns in reverse
    const pageBreakPatterns = [/<w:br\s+w:type=["']page["']\s*\/>/g, /<w:sectPr[^>]*>/g];

    let latestBreak = null;
    let latestBreakEnd = -1;

    for (const pattern of pageBreakPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match.index >= position) {
          break;
        }
        if (match.index > latestBreakEnd) {
          latestBreak = match;
          latestBreakEnd = match.index + match[0].length;
        }
      }
      pattern.lastIndex = 0;
    }

    if (latestBreak) {
      return {
        start: latestBreak.index,
        end: latestBreakEnd,
        type: 'pageBreak',
      };
    }

    return null;
  }

  /**
   * Find page break after a position
   * @param {string} content - XML content
   * @param {number} position - Position to search after
   * @returns {Object|null} Page break info or null
   */
  findPageBreakAfter(content, position) {
    // Look for page break patterns forward
    const pageBreakPatterns = [/<w:br\s+w:type=["']page["']\s*\/>/, /<w:sectPr[^>]*>/];

    const searchContent = content.slice(position);
    let earliestBreak = null;
    let earliestIndex = Infinity;

    for (const pattern of pageBreakPatterns) {
      const match = pattern.exec(searchContent);
      if (match && match.index < earliestIndex) {
        earliestIndex = match.index;
        earliestBreak = {
          start: position + match.index,
          end: position + match.index + match[0].length,
          type: 'pageBreak',
        };
      }
    }

    return earliestBreak;
  }

  /**
   * Estimate page number based on position
   * @param {string} content - XML content
   * @param {number} position - Position in content
   * @returns {number} Estimated page number
   */
  estimatePageNumber(content, position) {
    // Count page breaks before this position
    const pageBreakRegex = /<w:br\s+w:type=["']page["']\s*\/>/g;
    let count = 1; // Start at page 1
    let match;

    while ((match = pageBreakRegex.exec(content)) !== null) {
      if (match.index >= position) {
        break;
      }
      count++;
    }

    return count;
  }

  /**
   * Delete a slide from a PowerPoint presentation
   * @param {Object} file - PowerPoint slide file object
   * @param {Array} directives - Delete directives for this file
   * @returns {Object} Deletion result
   */
  deletePowerPointSlide(file, directives) {
    try {
      // For PowerPoint, deleting a slide means removing the entire slide XML file
      // and updating the presentation.xml file to remove references

      // Extract slide number from file path (e.g., ppt/slides/slide1.xml)
      const slideNumberMatch = file.path.match(/slide(\d+)\.xml$/i);
      const slideNumber = slideNumberMatch ? parseInt(slideNumberMatch[1], 10) : null;

      if (!slideNumber) {
        return {
          success: false,
          error: 'Could not determine slide number from file path',
          modifiedFile: file,
          deletedSlides: [],
        };
      }

      // Mark the entire slide file for deletion by emptying its content
      // The actual file removal will be handled by the ZIP handler
      const deletedSlides = [
        {
          directive: directives.map((d) => d.cleanName).join(', '),
          slideNumber,
          filePath: file.path,
        },
      ];

      return {
        success: true,
        modifiedFile: {
          ...file,
          content: '', // Empty content marks file for deletion
          modified: true,
          markedForDeletion: true,
        },
        deletedSlides,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        modifiedFile: file,
        deletedSlides: [],
      };
    }
  }

  /**
   * Delete a row from an Excel spreadsheet
   * @param {Object} file - Excel sheet file object
   * @param {Array} directives - Delete directives for this file
   * @returns {Object} Deletion result
   */
  deleteExcelRow(file, directives) {
    try {
      let modifiedContent = file.content;
      const deletedRows = [];

      // Excel rows are defined in <row> elements
      // Find and remove the containing row element for each directive

      for (const directive of directives) {
        const rowInfo = this.findContainingElement(
          modifiedContent,
          directive.position.index,
          'row'
        );
        if (rowInfo) {
          // Remove the entire row element
          const beforeRow = modifiedContent.slice(0, rowInfo.start);
          const afterRow = modifiedContent.slice(rowInfo.end);
          modifiedContent = beforeRow + afterRow;

          deletedRows.push({
            directive: directive.cleanName,
            startIndex: rowInfo.start,
            endIndex: rowInfo.end,
          });
        }
      }

      return {
        success: true,
        modifiedFile: {
          ...file,
          content: modifiedContent,
          modified: true,
        },
        deletedRows,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        modifiedFile: file,
        deletedRows: [],
      };
    }
  }

  /**
   * Group directives by file path
   * @param {Array} directives - Array of directives
   * @returns {Map} Map of file path to directives
   */
  groupByFile(directives) {
    const grouped = new Map();
    for (const directive of directives) {
      const filePath = directive.position?.file;
      if (!filePath) {
        continue;
      }
      if (!grouped.has(filePath)) {
        grouped.set(filePath, []);
      }
      grouped.get(filePath).push(directive);
    }
    return grouped;
  }

  /**
   * Get data value from nested object using dot notation
   * @param {Object} data - Data object
   * @param {string} path - Dot notation path
   * @returns {*} Data value or null
   */
  getDataValue(data, path) {
    if (!data || !path) {
      return null;
    }

    const parts = path.split('.');
    let current = data;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return null;
      }
      current = current[part];
    }

    return current === undefined ? null : current;
  }

  /**
   * Check if a value should be considered empty
   * @param {*} value - Value to check
   * @returns {boolean} True if value is empty
   */
  isEmptyValue(value) {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === 'string' && value.trim() === '') {
      return true;
    }
    if (Array.isArray(value) && value.length === 0) {
      return true;
    }
    if (typeof value === 'object' && Object.keys(value).length === 0) {
      return true;
    }
    return false;
  }
}

module.exports = ContentDeletion;
