/**
 * Template Caching System
 * Provides efficient caching for templates, parsed results, and processed documents
 */

/**
 * TemplateCache class for managing document template caching
 */
class TemplateCache {
  constructor(options = {}) {
    this.options = {
      maxSize: options.maxSize || 50, // Maximum cache entries
      ttl: options.ttl || 30 * 60 * 1000, // Time to live in milliseconds (30 minutes)
      enableLRU: options.enableLRU !== false, // Enable LRU eviction
      enableMetrics: options.enableMetrics !== false, // Enable cache metrics
    };

    // Cache stores
    this.templateCache = new Map(); // Parsed template cache
    this.documentCache = new Map(); // Processed document cache
    this.dataCache = new Map(); // Data transformation cache
    this.accessTimes = new Map(); // LRU tracking

    // Cache metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      cacheWrites: 0,
    };

    // Cleanup timer
    this.cleanupTimer = null;
    if (this.options.ttl > 0) {
      this.startCleanupTimer();
    }
  }

  /**
   * Get template from cache
   * @param {string} key - Cache key
   * @returns {Object|null} Cached template or null
   */
  getTemplate(key) {
    return this.get('template', key);
  }

  /**
   * Set template in cache
   * @param {string} key - Cache key
   * @param {Object} template - Template object
   * @param {Object} options - Cache options
   */
  setTemplate(key, template, options = {}) {
    this.set('template', key, template, options);
  }

  /**
   * Get processed document from cache
   * @param {string} key - Cache key
   * @returns {Object|null} Cached document or null
   */
  getDocument(key) {
    return this.get('document', key);
  }

  /**
   * Set processed document in cache
   * @param {string} key - Cache key
   * @param {Object} document - Document object
   * @param {Object} options - Cache options
   */
  setDocument(key, document, options = {}) {
    this.set('document', key, document, options);
  }

  /**
   * Get data transformation from cache
   * @param {string} key - Cache key
   * @returns {*} Cached data or null
   */
  getData(key) {
    return this.get('data', key);
  }

  /**
   * Set data transformation in cache
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {Object} options - Cache options
   */
  setData(key, data, options = {}) {
    this.set('data', key, data, options);
  }

  /**
   * Generic get method
   * @param {string} type - Cache type (template, document, data)
   * @param {string} key - Cache key
   * @returns {*} Cached value or null
   */
  get(type, key) {
    if (!this.isValidType(type)) {
      throw new Error(`Invalid cache type: ${type}`);
    }

    const cache = this.getCacheStore(type);
    const entry = cache.get(key);

    this.metrics.totalRequests++;

    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    // Check TTL
    if (this.isExpired(entry)) {
      cache.delete(key);
      this.accessTimes.delete(this.getCacheKey(type, key));
      this.metrics.misses++;
      return null;
    }

    // Update LRU
    if (this.options.enableLRU) {
      this.accessTimes.set(this.getCacheKey(type, key), Date.now());
    }

    this.metrics.hits++;
    return entry.value;
  }

  /**
   * Generic set method
   * @param {string} type - Cache type
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {Object} options - Cache options
   */
  set(type, key, value, options = {}) {
    if (!this.isValidType(type)) {
      throw new Error(`Invalid cache type: ${type}`);
    }

    const cache = this.getCacheStore(type);
    const cacheKey = this.getCacheKey(type, key);

    // Check if we need to evict
    if (cache.size >= this.options.maxSize && !cache.has(key)) {
      this.evictLRU(type);
    }

    const entry = {
      value: this.cloneValue(value),
      timestamp: Date.now(),
      ttl: options.ttl || this.options.ttl,
      metadata: options.metadata || {},
    };

    cache.set(key, entry);

    if (this.options.enableLRU) {
      this.accessTimes.set(cacheKey, Date.now());
    }

    this.metrics.cacheWrites++;
  }

  /**
   * Generate cache key for template
   * @param {Array} xmlFiles - XML files array
   * @param {Object} options - Template options
   * @returns {string} Cache key
   */
  generateTemplateKey(xmlFiles, options = {}) {
    const fileHashes = xmlFiles
      .map((file) => `${file.path}:${this.simpleHash(file.content)}`)
      .sort()
      .join('|');

    const optionsHash = this.simpleHash(JSON.stringify(options));
    return `template:${this.simpleHash(fileHashes)}:${optionsHash}`;
  }

  /**
   * Generate cache key for document
   * @param {string} templateKey - Template cache key
   * @param {Object} data - Data object
   * @param {Object} options - Processing options
   * @returns {string} Cache key
   */
  generateDocumentKey(templateKey, data, options = {}) {
    const dataHash = this.simpleHash(JSON.stringify(data));
    const optionsHash = this.simpleHash(JSON.stringify(options));
    return `document:${templateKey}:${dataHash}:${optionsHash}`;
  }

  /**
   * Generate cache key for data transformation
   * @param {string} transformation - Transformation type
   * @param {*} input - Input data
   * @returns {string} Cache key
   */
  generateDataKey(transformation, input) {
    const inputHash = this.simpleHash(JSON.stringify(input));
    return `data:${transformation}:${inputHash}`;
  }

  /**
   * Check if entry is expired
   * @param {Object} entry - Cache entry
   * @returns {boolean} True if expired
   */
  isExpired(entry) {
    if (!entry.ttl || entry.ttl <= 0) {
      return false;
    }
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict least recently used item from cache type
   * @param {string} type - Cache type
   */
  evictLRU(type) {
    if (!this.options.enableLRU) {
      // If LRU is disabled, evict random item
      const cache = this.getCacheStore(type);
      const firstKey = cache.keys().next().value;
      if (firstKey) {
        cache.delete(firstKey);
        this.metrics.evictions++;
      }
      return;
    }

    let oldestTime = Date.now();
    let oldestKey = null;
    let oldestCacheKey = null;

    for (const [cacheKey, accessTime] of this.accessTimes) {
      if (cacheKey.startsWith(`${type}:`) && accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestCacheKey = cacheKey;
        oldestKey = cacheKey.replace(`${type}:`, '');
      }
    }

    if (oldestKey) {
      const cache = this.getCacheStore(type);
      cache.delete(oldestKey);
      this.accessTimes.delete(oldestCacheKey);
      this.metrics.evictions++;
    }
  }

  /**
   * Clear cache of specific type or all caches
   * @param {string} type - Cache type to clear (optional)
   */
  clear(type = null) {
    if (type) {
      if (this.isValidType(type)) {
        const cache = this.getCacheStore(type);
        cache.clear();

        // Clear related access times
        for (const [key] of this.accessTimes) {
          if (key.startsWith(`${type}:`)) {
            this.accessTimes.delete(key);
          }
        }
      }
    } else {
      // Clear all caches
      this.templateCache.clear();
      this.documentCache.clear();
      this.dataCache.clear();
      this.accessTimes.clear();
    }

    this.resetMetrics();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const hitRate =
      this.metrics.totalRequests > 0 ? (this.metrics.hits / this.metrics.totalRequests) * 100 : 0;

    return {
      ...this.metrics,
      hitRate: parseFloat(hitRate.toFixed(2)),
      cacheSizes: {
        templates: this.templateCache.size,
        documents: this.documentCache.size,
        data: this.dataCache.size,
      },
      memoryEstimate: this.estimateMemoryUsage(),
    };
  }

  /**
   * Reset cache metrics
   */
  resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      cacheWrites: 0,
    };
  }

  /**
   * Estimate memory usage of cache
   * @returns {number} Estimated memory usage in bytes
   */
  estimateMemoryUsage() {
    let totalSize = 0;

    // Rough estimation based on JSON serialization
    try {
      const templateSize = JSON.stringify([...this.templateCache.values()]).length * 2;
      const documentSize = JSON.stringify([...this.documentCache.values()]).length * 2;
      const dataSize = JSON.stringify([...this.dataCache.values()]).length * 2;

      totalSize = templateSize + documentSize + dataSize;
    } catch {
      // Fallback estimation
      totalSize = (this.templateCache.size + this.documentCache.size + this.dataCache.size) * 1024;
    }

    return totalSize;
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    let cleanedCount = 0;

    // Clean template cache
    for (const [key, entry] of this.templateCache) {
      if (this.isExpired(entry)) {
        this.templateCache.delete(key);
        this.accessTimes.delete(`template:${key}`);
        cleanedCount++;
      }
    }

    // Clean document cache
    for (const [key, entry] of this.documentCache) {
      if (this.isExpired(entry)) {
        this.documentCache.delete(key);
        this.accessTimes.delete(`document:${key}`);
        cleanedCount++;
      }
    }

    // Clean data cache
    for (const [key, entry] of this.dataCache) {
      if (this.isExpired(entry)) {
        this.dataCache.delete(key);
        this.accessTimes.delete(`data:${key}`);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Start automatic cleanup timer
   */
  startCleanupTimer() {
    if (this.options.ttl <= 0) {
      return; // Don't start timer if TTL is 0 or negative
    }

    const interval = Math.max(this.options.ttl / 4, 60000); // Clean every 1/4 TTL or 1 minute minimum

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, interval);
  }

  /**
   * Stop automatic cleanup timer
   */
  stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Configure cache options
   * @param {Object} options - New options
   */
  configure(options) {
    const oldTTL = this.options.ttl;
    this.options = { ...this.options, ...options };

    // Restart cleanup timer if TTL changed
    if (options.ttl !== undefined && options.ttl !== oldTTL) {
      this.stopCleanupTimer();
      if (this.options.ttl > 0) {
        this.startCleanupTimer();
      }
    }
  }

  /**
   * Get cache store for type
   * @param {string} type - Cache type
   * @returns {Map} Cache store
   */
  getCacheStore(type) {
    switch (type) {
      case 'template':
        return this.templateCache;
      case 'document':
        return this.documentCache;
      case 'data':
        return this.dataCache;
      default:
        throw new Error(`Invalid cache type: ${type}`);
    }
  }

  /**
   * Get cache key with type prefix
   * @param {string} type - Cache type
   * @param {string} key - Original key
   * @returns {string} Prefixed cache key
   */
  getCacheKey(type, key) {
    return `${type}:${key}`;
  }

  /**
   * Check if cache type is valid
   * @param {string} type - Cache type
   * @returns {boolean} True if valid
   */
  isValidType(type) {
    return ['template', 'document', 'data'].includes(type);
  }

  /**
   * Deep clone a value for caching
   * @param {*} value - Value to clone
   * @returns {*} Cloned value
   */
  cloneValue(value) {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    // Handle Maps specially
    if (value instanceof Map) {
      const clonedMap = new Map();
      for (const [key, val] of value) {
        clonedMap.set(key, this.cloneValue(val));
      }
      return clonedMap;
    }

    // Handle Arrays
    if (Array.isArray(value)) {
      return value.map((item) => this.cloneValue(item));
    }

    // Handle plain objects
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      // Fallback for non-serializable objects
      return value;
    }
  }

  /**
   * Simple hash function for cache keys
   * @param {string} content - Content to hash
   * @returns {number} Hash value
   */
  simpleHash(content) {
    let hash = 0;
    if (!content || content.length === 0) {
      return hash;
    }

    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy() {
    this.stopCleanupTimer();
    this.clear();
  }
}

module.exports = TemplateCache;
