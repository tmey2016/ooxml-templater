/**
 * Placeholder Substitution Engine
 * Handles the replacement of placeholders with actual data
 */

const ContentDeletion = require('./content-deletion');

/**
 * PlaceholderSubstitution class for replacing placeholders with data
 */
class PlaceholderSubstitution {
  constructor() {
    // Track substitution statistics
    this.stats = {
      totalSubstitutions: 0,
      successfulSubstitutions: 0,
      failedSubstitutions: 0,
      deletedElements: 0,
    };

    // Configuration options
    this.options = {
      strictMode: false, // If true, throws error on missing data
      preserveUnmatched: true, // If true, keeps unmatched placeholders
      logMissingData: true, // If true, logs missing data warnings
      deleteEmptyElements: true, // If true, processes delete directives
    };

    // Initialize content deletion handler
    this.contentDeletion = new ContentDeletion();
  }

  /**
   * Substitute placeholders in document with provided data
   * @param {Object} parseResult - Result from PlaceholderParser
   * @param {Object} data - Data object for substitution
   * @param {Object} xmlFiles - Original XML files
   * @param {Object} options - Substitution options
   * @returns {Object} Substitution result with modified XML files
   */
  substituteDocument(parseResult, data, xmlFiles, options = {}) {
    this.resetStats();
    this.options = { ...this.options, ...options };

    const modifiedFiles = new Map();
    const deletionCandidates = new Set();

    // Ensure fileMap exists and is iterable
    if (!parseResult.fileMap || !(parseResult.fileMap instanceof Map)) {
      return {
        modifiedFiles,
        stats: { ...this.stats },
        deletionCandidates: [],
        success: true,
      };
    }

    // Process each file that contains placeholders
    for (const [filePath, placeholders] of parseResult.fileMap) {
      const originalFile = xmlFiles.find((f) => f.path === filePath);
      if (!originalFile) {
        continue;
      }

      let modifiedContent = originalFile.content;
      const filePlaceholders = [...placeholders].sort(
        (a, b) => b.position.index - a.position.index
      );

      // Process placeholders in reverse order to maintain string positions
      for (const placeholder of filePlaceholders) {
        const result = this.substitutePlaceholder(placeholder, data, modifiedContent);
        modifiedContent = result.content;

        if (result.shouldDelete) {
          deletionCandidates.add(filePath);
        }
      }

      modifiedFiles.set(filePath, {
        ...originalFile,
        content: modifiedContent,
        modified: modifiedContent !== originalFile.content,
      });
    }

    // Handle numeric directives - find and replace numbers in ALL XML files (including embedded)
    if (parseResult.numericDirectives && parseResult.numericDirectives.length > 0) {
      this.processNumericDirectivesGlobal(parseResult.numericDirectives, data, xmlFiles, modifiedFiles);
    }

    // Handle delete directives
    if (this.options.deleteEmptyElements) {
      this.processDeleteDirectives(
        parseResult.deleteDirectives,
        data,
        modifiedFiles,
        deletionCandidates
      );
    }

    return {
      modifiedFiles,
      stats: { ...this.stats },
      deletionCandidates: Array.from(deletionCandidates),
      success: this.stats.failedSubstitutions === 0 || !this.options.strictMode,
    };
  }

  /**
   * Process numeric directives globally - replace numeric values across ALL files
   * @param {Array} numericDirectives - Array of numeric directive placeholders
   * @param {Object} data - Data object
   * @param {Array} xmlFiles - All XML files
   * @param {Map} modifiedFiles - Map of modified files
   */
  processNumericDirectivesGlobal(numericDirectives, data, xmlFiles, modifiedFiles) {
    for (const directive of numericDirectives) {
      const numericValue = directive.numericValue; // e.g., 111111
      const replacementValue = this.getDataValue(data, directive.cleanName); // e.g., 17.2

      if (replacementValue === null || replacementValue === undefined) {
        continue; // Skip if no data available
      }

      // Search through ALL XML files for this numeric value
      for (const xmlFile of xmlFiles) {
        const currentContent = modifiedFiles.has(xmlFile.path)
          ? modifiedFiles.get(xmlFile.path).content
          : xmlFile.content;

        if (!currentContent) {
          continue;
        }

        // Look for the numeric value in XML value tags (Excel format)
        const numericPattern = new RegExp(`<v>${numericValue}</v>`, 'g');

        if (numericPattern.test(currentContent)) {
          // Replace all occurrences
          const newContent = currentContent.replace(
            numericPattern,
            `<v>${replacementValue}</v>`
          );

          modifiedFiles.set(xmlFile.path, {
            ...xmlFile,
            content: newContent,
            modified: true,
          });

          this.stats.successfulSubstitutions++;
        }
      }
    }
  }

  /**
   * Substitute a single placeholder
   * @param {Object} placeholder - Placeholder object
   * @param {Object} data - Data object
   * @param {string} content - Current content
   * @returns {Object} Substitution result
   */
  substitutePlaceholder(placeholder, data, content) {
    this.stats.totalSubstitutions++;

    try {
      let replacement;
      let shouldDelete = false;

      if (placeholder.type === 'delete') {
        const result = this.processDeleteDirective(placeholder, data);
        replacement = result.replacement;
        shouldDelete = result.shouldDelete;
      } else {
        replacement = this.getDataValue(data, placeholder.cleanName);
      }

      if (replacement === null || replacement === undefined) {
        return this.handleMissingData(placeholder, content);
      }

      // Handle numeric directives
      if (placeholder.type === 'numeric') {
        replacement = this.processNumericDirective(placeholder, replacement);
      }

      const newContent = this.replaceInContent(
        content,
        placeholder.position.index,
        placeholder.position.length,
        String(replacement)
      );

      this.stats.successfulSubstitutions++;
      return {
        content: newContent,
        shouldDelete,
        success: true,
      };
    } catch (error) {
      this.stats.failedSubstitutions++;
      if (this.options.strictMode) {
        throw new Error(`Substitution failed for ${placeholder.cleanName}: ${error.message}`);
      }
      return {
        content,
        shouldDelete: false,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process a delete directive placeholder
   * @param {Object} placeholder - Delete directive placeholder
   * @param {Object} data - Data object
   * @returns {Object} Processing result
   */
  processDeleteDirective(placeholder, data) {
    const conditionValue = this.getDataValue(data, placeholder.cleanName);
    const isEmpty = this.isEmptyValue(conditionValue);

    if (isEmpty) {
      this.stats.deletedElements++;
      return {
        replacement: '',
        shouldDelete: true,
      };
    }

    return {
      replacement: conditionValue || '',
      shouldDelete: false,
    };
  }

  /**
   * Process numeric directive for charts
   * @param {Object} placeholder - Numeric directive placeholder
   * @param {*} value - Data value
   * @returns {*} Processed value
   */
  processNumericDirective(placeholder, value) {
    // For charts, we need to maintain the numeric format
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
      if (this.options.logMissingData) {
        // eslint-disable-next-line no-console
        console.warn(`Non-numeric value for chart placeholder ${placeholder.cleanName}: ${value}`);
      }
      return placeholder.numericValue; // Fallback to original number
    }
    return numericValue;
  }

  /**
   * Handle missing data scenarios
   * @param {Object} placeholder - Placeholder object
   * @param {string} content - Current content
   * @returns {Object} Handling result
   */
  handleMissingData(placeholder, content) {
    this.stats.failedSubstitutions++;

    if (this.options.logMissingData) {
      // eslint-disable-next-line no-console
      console.warn(`Missing data for placeholder: ${placeholder.cleanName}`);
    }

    if (this.options.strictMode) {
      throw new Error(`Missing data for required placeholder: ${placeholder.cleanName}`);
    }

    if (!this.options.preserveUnmatched) {
      // Remove the placeholder entirely
      const newContent = this.replaceInContent(
        content,
        placeholder.position.index,
        placeholder.position.length,
        ''
      );
      return {
        content: newContent,
        shouldDelete: false,
        success: false,
      };
    }

    // Keep the placeholder as-is
    return {
      content,
      shouldDelete: false,
      success: false,
    };
  }

  /**
   * Process all delete directives for conditional content removal
   * @param {Array} deleteDirectives - Array of delete directive placeholders
   * @param {Object} data - Data object
   * @param {Map} modifiedFiles - Map of modified files
   * @param {Set} deletionCandidates - Set of files marked for deletion
   */
  processDeleteDirectives(deleteDirectives, data, modifiedFiles, deletionCandidates) {
    // Use ContentDeletion handler for advanced deletion logic
    const deletionResult = this.contentDeletion.processDeleteDirectives(
      deleteDirectives,
      data,
      modifiedFiles,
      null // extractedZip can be null for basic operations
    );

    // Update modified files with deletion results
    for (const [filePath, file] of deletionResult.modifiedFiles) {
      modifiedFiles.set(filePath, file);
      if (file.markedForDeletion) {
        deletionCandidates.add(filePath);
      }
    }

    // Update statistics
    this.stats.deletedElements +=
      deletionResult.deletedPages.length +
      deletionResult.deletedSlides.length +
      deletionResult.deletedRows.length;

    // Log any errors
    if (deletionResult.errors.length > 0 && this.options.logMissingData) {
      deletionResult.errors.forEach((error) => {
        // eslint-disable-next-line no-console
        console.warn(`Deletion error in ${error.file} (${error.type}): ${error.error}`);
      });
    }
  }

  /**
   * Group delete directives by file path
   * @param {Array} deleteDirectives - Array of delete directives
   * @returns {Map} Grouped directives by file path
   */
  groupDeleteDirectivesByFile(deleteDirectives) {
    const grouped = new Map();
    for (const directive of deleteDirectives) {
      const filePath = directive.position.file;
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
   * @param {string} path - Dot notation path (e.g., "user.name")
   * @returns {*} Data value or null if not found
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
   * Check if a value should be considered empty for delete directives
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

  /**
   * Replace content at specific position
   * @param {string} content - Original content
   * @param {number} index - Start index
   * @param {number} length - Length to replace
   * @param {string} replacement - Replacement string
   * @returns {string} Modified content
   */
  replaceInContent(content, index, length, replacement) {
    return content.slice(0, index) + replacement + content.slice(index + length);
  }

  /**
   * Reset substitution statistics
   */
  resetStats() {
    this.stats = {
      totalSubstitutions: 0,
      successfulSubstitutions: 0,
      failedSubstitutions: 0,
      deletedElements: 0,
    };
  }

  /**
   * Get substitution statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      successRate:
        this.stats.totalSubstitutions > 0
          ? (this.stats.successfulSubstitutions / this.stats.totalSubstitutions) * 100
          : 0,
    };
  }

  /**
   * Configure substitution options
   * @param {Object} options - Options to set
   */
  configure(options) {
    this.options = { ...this.options, ...options };
  }

  /**
   * Validate data against placeholder requirements
   * @param {Object} parseResult - Parse result from PlaceholderParser
   * @param {Object} data - Data object to validate
   * @returns {Object} Validation result
   */
  validateData(parseResult, data) {
    const missing = [];
    const available = [];
    const typeErrors = [];

    for (const placeholderName of parseResult.uniquePlaceholderList) {
      const value = this.getDataValue(data, placeholderName);

      if (value === null || value === undefined) {
        missing.push(placeholderName);
      } else {
        available.push(placeholderName);
      }
    }

    // Check numeric directives have numeric data
    for (const directive of parseResult.numericDirectives) {
      const value = this.getDataValue(data, directive.cleanName);
      if (value !== null && value !== undefined && isNaN(parseFloat(value))) {
        typeErrors.push({
          placeholder: directive.cleanName,
          expected: 'number',
          received: typeof value,
        });
      }
    }

    return {
      valid: missing.length === 0 && typeErrors.length === 0,
      missing,
      available,
      typeErrors,
      coverage:
        parseResult.uniquePlaceholderList.length > 0
          ? (available.length / parseResult.uniquePlaceholderList.length) * 100
          : 100,
    };
  }
}

module.exports = PlaceholderSubstitution;
