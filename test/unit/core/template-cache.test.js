/**
 * Template Cache tests
 */

const TemplateCache = require('../../../src/core/template-cache');

describe('TemplateCache', () => {
  let cache;

  beforeEach(() => {
    cache = new TemplateCache({
      maxSize: 5,
      ttl: 0, // Disable timer to avoid test hangs
      enableMetrics: true,
    });
  });

  afterEach(() => {
    if (cache) {
      cache.destroy();
      cache = null;
    }
  });

  describe('Constructor', () => {
    test('should create instance with default options', () => {
      const defaultCache = new TemplateCache();

      expect(defaultCache.options.maxSize).toBe(50);
      expect(defaultCache.options.ttl).toBe(30 * 60 * 1000);
      expect(defaultCache.options.enableLRU).toBe(true);
      expect(defaultCache.options.enableMetrics).toBe(true);

      defaultCache.destroy();
    });

    test('should create instance with custom options', () => {
      expect(cache.options.maxSize).toBe(5);
      expect(cache.options.ttl).toBe(0); // Matches beforeEach initialization
      expect(cache.options.enableLRU).toBe(true);
      expect(cache.options.enableMetrics).toBe(true);
    });

    test('should initialize cache stores', () => {
      expect(cache.templateCache).toBeInstanceOf(Map);
      expect(cache.documentCache).toBeInstanceOf(Map);
      expect(cache.dataCache).toBeInstanceOf(Map);
      expect(cache.accessTimes).toBeInstanceOf(Map);
    });
  });

  describe('Template Caching', () => {
    test('should set and get template', () => {
      const template = { id: 'test', placeholders: ['user.name'] };
      const key = 'template-key-1';

      cache.setTemplate(key, template);
      const retrieved = cache.getTemplate(key);

      expect(retrieved).toEqual(template);
      expect(retrieved).not.toBe(template); // Should be cloned
    });

    test('should return null for non-existent template', () => {
      const result = cache.getTemplate('non-existent');
      expect(result).toBeNull();
    });

    test('should update metrics correctly', () => {
      const template = { id: 'test' };
      cache.setTemplate('key1', template);

      cache.getTemplate('key1'); // Hit
      cache.getTemplate('missing'); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.totalRequests).toBe(2);
      expect(stats.cacheWrites).toBe(1);
      expect(stats.hitRate).toBe(50);
    });
  });

  describe('Document Caching', () => {
    test('should set and get document', () => {
      const document = { content: 'processed content', metadata: {} };
      const key = 'doc-key-1';

      cache.setDocument(key, document);
      const retrieved = cache.getDocument(key);

      expect(retrieved).toEqual(document);
    });

    test('should handle large documents', () => {
      const largeDocument = {
        content: 'x'.repeat(10000),
        files: Array.from({ length: 100 }, (_, i) => ({ id: i, data: 'data' })),
      };

      cache.setDocument('large-doc', largeDocument);
      const retrieved = cache.getDocument('large-doc');

      expect(retrieved.content).toBe(largeDocument.content);
      expect(retrieved.files).toHaveLength(100);
    });
  });

  describe('Data Caching', () => {
    test('should set and get data', () => {
      const data = { user: { name: 'John', email: 'john@example.com' } };
      const key = 'data-key-1';

      cache.setData(key, data);
      const retrieved = cache.getData(key);

      expect(retrieved).toEqual(data);
    });

    test('should handle different data types', () => {
      cache.setData('string', 'test string');
      cache.setData('number', 12345);
      cache.setData('boolean', true);
      cache.setData('array', [1, 2, 3]);
      cache.setData('null', null);

      expect(cache.getData('string')).toBe('test string');
      expect(cache.getData('number')).toBe(12345);
      expect(cache.getData('boolean')).toBe(true);
      expect(cache.getData('array')).toEqual([1, 2, 3]);
      expect(cache.getData('null')).toBeNull();
    });
  });

  describe('TTL and Expiration', () => {
    test('should expire entries after TTL', () => {
      const shortCache = new TemplateCache({ ttl: 0 }); // No timer
      shortCache.configure({ ttl: 100 }); // Set TTL
      shortCache.setTemplate('key1', { data: 'test' });

      expect(shortCache.getTemplate('key1')).toBeTruthy();

      // Manually expire by manipulating timestamp
      const entry = shortCache.templateCache.get('key1');
      entry.timestamp = Date.now() - 150; // Expired

      expect(shortCache.getTemplate('key1')).toBeNull();
      shortCache.destroy();
    });

    test('should not expire when TTL is 0', () => {
      const noTTLCache = new TemplateCache({ ttl: 0 });
      noTTLCache.setTemplate('key1', { data: 'test' });

      expect(noTTLCache.getTemplate('key1')).toBeTruthy();
      noTTLCache.destroy();
    });

    test('should cleanup expired entries', () => {
      const shortCache = new TemplateCache({ ttl: 0 }); // No timer
      shortCache.configure({ ttl: 50 });
      shortCache.setTemplate('key1', { data: 'test1' });
      shortCache.setTemplate('key2', { data: 'test2' });

      // Manually expire entries
      for (const [key, entry] of shortCache.templateCache) {
        entry.timestamp = Date.now() - 100;
      }

      const cleanedCount = shortCache.cleanup();
      expect(cleanedCount).toBe(2);
      expect(shortCache.templateCache.size).toBe(0);

      shortCache.destroy();
    });
  });

  describe('LRU Eviction', () => {
    test('should evict items when cache is full', () => {
      // Fill cache to max size
      for (let i = 0; i < 5; i++) {
        cache.setTemplate(`key${i}`, { id: i });
      }

      expect(cache.templateCache.size).toBe(5);

      // Add one more item, should trigger eviction
      cache.setTemplate('key5', { id: 5 });

      // Cache should not exceed max size
      expect(cache.templateCache.size).toBe(5);

      // The new item should exist
      expect(cache.getTemplate('key5')).toBeTruthy();

      // Should have evicted exactly one item
      const evictions = cache.getStats().evictions;
      expect(evictions).toBe(1);
    });

    test('should work without LRU when disabled', () => {
      const noLRUCache = new TemplateCache({ maxSize: 2, enableLRU: false, ttl: 0 });

      noLRUCache.setTemplate('key1', { id: 1 });
      noLRUCache.setTemplate('key2', { id: 2 });
      noLRUCache.setTemplate('key3', { id: 3 }); // Should evict one

      expect(noLRUCache.templateCache.size).toBe(2);
      noLRUCache.destroy();
    });
  });

  describe('Key Generation', () => {
    test('should generate consistent template keys', () => {
      const xmlFiles1 = [
        { path: 'file1.xml', content: 'content1' },
        { path: 'file2.xml', content: 'content2' },
      ];
      const xmlFiles2 = [
        { path: 'file2.xml', content: 'content2' },
        { path: 'file1.xml', content: 'content1' },
      ];

      const key1 = cache.generateTemplateKey(xmlFiles1);
      const key2 = cache.generateTemplateKey(xmlFiles2);

      expect(key1).toBe(key2); // Should be same regardless of order
    });

    test('should generate different keys for different content', () => {
      const xmlFiles1 = [{ path: 'file1.xml', content: 'content1' }];
      const xmlFiles2 = [{ path: 'file1.xml', content: 'content2' }];

      const key1 = cache.generateTemplateKey(xmlFiles1);
      const key2 = cache.generateTemplateKey(xmlFiles2);

      expect(key1).not.toBe(key2);
    });

    test('should generate document keys', () => {
      const templateKey = 'template-123';
      const data = { user: { name: 'John' } };
      const options = { strictMode: true };

      const key = cache.generateDocumentKey(templateKey, data, options);

      expect(key).toContain('document:');
      expect(key).toContain(templateKey);
      expect(typeof key).toBe('string');
    });

    test('should generate data keys', () => {
      const transformation = 'normalize';
      const input = { value: 123 };

      const key = cache.generateDataKey(transformation, input);

      expect(key).toContain('data:');
      expect(key).toContain(transformation);
    });
  });

  describe('Cache Management', () => {
    test('should clear specific cache type', () => {
      cache.setTemplate('t1', { data: 'template' });
      cache.setDocument('d1', { data: 'document' });
      cache.setData('data1', { data: 'data' });

      cache.clear('template');

      expect(cache.templateCache.size).toBe(0);
      expect(cache.documentCache.size).toBe(1);
      expect(cache.dataCache.size).toBe(1);
    });

    test('should clear all caches', () => {
      cache.setTemplate('t1', { data: 'template' });
      cache.setDocument('d1', { data: 'document' });
      cache.setData('data1', { data: 'data' });

      cache.clear();

      expect(cache.templateCache.size).toBe(0);
      expect(cache.documentCache.size).toBe(0);
      expect(cache.dataCache.size).toBe(0);
    });

    test('should get comprehensive stats', () => {
      cache.setTemplate('t1', { data: 'template' });
      cache.setDocument('d1', { data: 'document' });
      cache.setData('data1', { data: 'data' });

      cache.getTemplate('t1'); // Hit
      cache.getTemplate('missing'); // Miss

      const stats = cache.getStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50);
      expect(stats.cacheSizes.templates).toBe(1);
      expect(stats.cacheSizes.documents).toBe(1);
      expect(stats.cacheSizes.data).toBe(1);
      expect(stats.memoryEstimate).toBeGreaterThan(0);
    });

    test('should reset metrics', () => {
      cache.getTemplate('missing'); // Generate some metrics
      cache.resetMetrics();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.totalRequests).toBe(0);
    });
  });

  describe('Configuration', () => {
    test('should update configuration', () => {
      cache.configure({ maxSize: 10, ttl: 2000 });

      expect(cache.options.maxSize).toBe(10);
      expect(cache.options.ttl).toBe(2000);
    });

    test('should restart cleanup timer when TTL changes', () => {
      const originalTimer = cache.cleanupTimer;
      cache.configure({ ttl: 5000 });

      expect(cache.cleanupTimer).not.toBe(originalTimer);
    });
  });

  describe('Error Handling', () => {
    test('should throw error for invalid cache type', () => {
      expect(() => cache.get('invalid', 'key')).toThrow('Invalid cache type: invalid');
      expect(() => cache.set('invalid', 'key', 'value')).toThrow('Invalid cache type: invalid');
    });

    test('should handle non-serializable objects', () => {
      const circular = {};
      circular.self = circular;

      // Should not throw, but may not cache properly
      expect(() => cache.setData('circular', circular)).not.toThrow();
    });
  });

  describe('Hash Function', () => {
    test('should generate consistent hashes', () => {
      const content = 'test content';
      const hash1 = cache.simpleHash(content);
      const hash2 = cache.simpleHash(content);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('number');
    });

    test('should generate different hashes for different content', () => {
      const hash1 = cache.simpleHash('content1');
      const hash2 = cache.simpleHash('content2');

      expect(hash1).not.toBe(hash2);
    });

    test('should handle empty content', () => {
      expect(cache.simpleHash('')).toBe(0);
      expect(cache.simpleHash(null)).toBe(0);
      expect(cache.simpleHash(undefined)).toBe(0);
    });
  });

  describe('Cleanup Timer', () => {
    test('should start and stop cleanup timer', () => {
      const testCache = new TemplateCache({ ttl: 0 }); // Start with no timer
      expect(testCache.cleanupTimer).toBeNull();

      // Configure TTL to start timer
      testCache.configure({ ttl: 1000 });
      expect(testCache.cleanupTimer).toBeTruthy();

      testCache.stopCleanupTimer();
      expect(testCache.cleanupTimer).toBeNull();

      testCache.startCleanupTimer();
      expect(testCache.cleanupTimer).toBeTruthy();

      testCache.destroy();
    });

    test('should not start timer when TTL is 0', () => {
      // Create a fresh cache instance with TTL 0
      const zeroTTLCache = new TemplateCache();
      zeroTTLCache.configure({ ttl: 0 });
      zeroTTLCache.stopCleanupTimer(); // Stop any existing timer
      zeroTTLCache.startCleanupTimer(); // Try to start - should not create timer

      expect(zeroTTLCache.cleanupTimer).toBeNull();
      zeroTTLCache.destroy();
    });
  });

  describe('TTL Expiration', () => {
    test('should have TTL option configured', () => {
      const ttlCache = new TemplateCache({ ttl: 0 }); // Use ttl:0 to avoid timer
      ttlCache.configure({ ttl: 5000 }); // Change TTL after creation
      expect(ttlCache.options.ttl).toBe(5000);
      ttlCache.destroy();
    });

    test('should store timestamp with cache entries', () => {
      const ttlCache = new TemplateCache({ ttl: 0 }); // No timer
      ttlCache.setTemplate('key1', { data: 'test' });

      // Access internal cache to verify timestamp exists
      const entry = ttlCache.templateCache.get('key1');
      expect(entry).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(typeof entry.timestamp).toBe('number');

      ttlCache.destroy();
    });

    test('should check expiration by manually modifying timestamp', () => {
      const ttlCache = new TemplateCache({ ttl: 0 }); // No timer
      ttlCache.configure({ ttl: 1000 }); // Set TTL for expiration logic

      ttlCache.setTemplate('key1', { data: 'test' });

      // Manually set timestamp to past to simulate expiration
      const entry = ttlCache.templateCache.get('key1');
      entry.timestamp = Date.now() - 2000; // 2 seconds ago

      const result = ttlCache.getTemplate('key1');
      expect(result).toBeNull(); // Should be expired

      ttlCache.destroy();
    });

    test('should call cleanup method', () => {
      const ttlCache = new TemplateCache({ ttl: 1000 }); //Start with TTL
      ttlCache.stopCleanupTimer(); // Stop timer immediately to avoid interference

      ttlCache.setTemplate('key1', { data: 'test1' });
      ttlCache.setTemplate('key2', { data: 'test2' });

      expect(ttlCache.templateCache.size).toBe(2);

      // Manually modify timestamps to simulate expiry
      for (const [key, entry] of ttlCache.templateCache) {
        entry.timestamp = Date.now() - 2000; // 2 seconds ago
      }

      ttlCache.cleanup();

      // Should have cleaned up expired entries
      expect(ttlCache.templateCache.size).toBe(0);

      ttlCache.destroy();
    });

    test('should not remove entries that have not expired', () => {
      const ttlCache = new TemplateCache({ ttl: 10000 }); // Long TTL
      ttlCache.stopCleanupTimer(); // Stop timer to avoid interference

      ttlCache.setTemplate('key1', { data: 'test1' });
      ttlCache.setTemplate('key2', { data: 'test2' });

      ttlCache.cleanup();

      // Nothing should be expired
      expect(ttlCache.templateCache.size).toBe(2);

      ttlCache.destroy();
    });

    test('should update timestamp when enableLRU is true', () => {
      const lruCache = new TemplateCache({ ttl: 0, enableLRU: true }); // No timer
      lruCache.configure({ ttl: 1000 });

      lruCache.setTemplate('key1', { data: 'test' });

      const firstEntry = lruCache.templateCache.get('key1');
      const firstTimestamp = firstEntry.timestamp;

      // Access again immediately
      lruCache.getTemplate('key1');
      const secondEntry = lruCache.templateCache.get('key1');

      // Timestamp should be updated (or at least not less)
      expect(secondEntry.timestamp).toBeGreaterThanOrEqual(firstTimestamp);

      lruCache.destroy();
    });
  });

  describe('Eviction Edge Cases', () => {
    test('should evict oldest entry when cache is full', () => {
      const smallCache = new TemplateCache({ maxSize: 2, enableLRU: true, ttl: 0 });

      smallCache.setTemplate('key1', { data: 'first' });
      smallCache.setTemplate('key2', { data: 'second' });

      expect(smallCache.templateCache.size).toBe(2);

      // Adding third should evict oldest
      smallCache.setTemplate('key3', { data: 'third' });

      expect(smallCache.templateCache.size).toBe(2);
      expect(smallCache.getTemplate('key1')).toBeNull(); // Evicted
      expect(smallCache.getTemplate('key2')).toBeTruthy();
      expect(smallCache.getTemplate('key3')).toBeTruthy();

      smallCache.destroy();
    });

    test('should evict least recently used when LRU is enabled', async () => {
      const lruCache = new TemplateCache({ maxSize: 2, enableLRU: true, ttl: 0 });

      lruCache.setTemplate('key1', { data: 'first' });
      await new Promise(resolve => setTimeout(resolve, 10));
      lruCache.setTemplate('key2', { data: 'second' });

      await new Promise(resolve => setTimeout(resolve, 10));
      // Access key1 to make it more recently used
      lruCache.getTemplate('key1');

      await new Promise(resolve => setTimeout(resolve, 10));
      // Adding third should evict key2 (least recently used)
      lruCache.setTemplate('key3', { data: 'third' });

      expect(lruCache.getTemplate('key1')).toBeTruthy(); // Still there
      expect(lruCache.getTemplate('key2')).toBeNull(); // Evicted
      expect(lruCache.getTemplate('key3')).toBeTruthy();

      lruCache.destroy();
    });

    test('should handle eviction with maxSize of 1', () => {
      const tinyCache = new TemplateCache({ maxSize: 1, enableLRU: true, ttl: 0 });

      tinyCache.setTemplate('key1', { data: 'first' });
      expect(tinyCache.templateCache.size).toBe(1);

      tinyCache.setTemplate('key2', { data: 'second' });
      expect(tinyCache.templateCache.size).toBe(1);
      expect(tinyCache.getTemplate('key1')).toBeNull();
      expect(tinyCache.getTemplate('key2')).toBeTruthy();

      tinyCache.destroy();
    });

    test('should evict independently across cache types', () => {
      const multiCache = new TemplateCache({ maxSize: 2, enableLRU: true, ttl: 0 });

      // Fill template cache
      multiCache.setTemplate('t1', { data: 'template1' });
      multiCache.setTemplate('t2', { data: 'template2' });
      multiCache.setTemplate('t3', { data: 'template3' }); // Evicts t1

      // Fill document cache
      multiCache.setDocument('d1', { data: 'doc1' });
      multiCache.setDocument('d2', { data: 'doc2' });
      multiCache.setDocument('d3', { data: 'doc3' }); // Evicts d1

      expect(multiCache.getTemplate('t1')).toBeNull();
      expect(multiCache.getTemplate('t2')).toBeTruthy();
      expect(multiCache.getDocument('d1')).toBeNull();
      expect(multiCache.getDocument('d2')).toBeTruthy();

      multiCache.destroy();
    });

    test('should handle concurrent evictions', () => {
      const concurrentCache = new TemplateCache({ maxSize: 3, enableLRU: true, ttl: 0 });

      // Fill cache to max
      concurrentCache.setTemplate('k1', { data: '1' });
      concurrentCache.setTemplate('k2', { data: '2' });
      concurrentCache.setTemplate('k3', { data: '3' });

      // Add multiple entries rapidly
      concurrentCache.setTemplate('k4', { data: '4' });
      concurrentCache.setTemplate('k5', { data: '5' });

      expect(concurrentCache.templateCache.size).toBe(3);
      expect(concurrentCache.getTemplate('k1')).toBeNull();
      expect(concurrentCache.getTemplate('k2')).toBeNull();
      expect(concurrentCache.getTemplate('k3')).toBeTruthy();

      concurrentCache.destroy();
    });

    test('should maintain accurate size after multiple evictions', () => {
      const sizeCache = new TemplateCache({ maxSize: 5, enableLRU: true, ttl: 0 });

      // Add 10 entries, should evict 5
      for (let i = 0; i < 10; i++) {
        sizeCache.setTemplate(`key${i}`, { data: `value${i}` });
      }

      expect(sizeCache.templateCache.size).toBe(5);

      const stats = sizeCache.getStats();
      expect(stats.cacheSizes.templates).toBe(5);

      sizeCache.destroy();
    });

    test('should handle eviction with all entries having same timestamp', () => {
      const sameTimeCache = new TemplateCache({ maxSize: 2, enableLRU: false, ttl: 0 });

      // Add entries at same time
      sameTimeCache.setTemplate('k1', { data: '1' });
      sameTimeCache.setTemplate('k2', { data: '2' });

      // Adding third entry should evict based on insertion order
      sameTimeCache.setTemplate('k3', { data: '3' });

      expect(sameTimeCache.templateCache.size).toBe(2);

      sameTimeCache.destroy();
    });
  });

  describe('Memory Estimation', () => {
    test('should estimate memory usage accurately', () => {
      const memCache = new TemplateCache({ ttl: 0 });

      const largeData = { content: 'x'.repeat(1000) };
      memCache.setTemplate('large', largeData);

      const stats = memCache.getStats();
      expect(stats.memoryEstimate).toBeGreaterThan(1000);

      memCache.destroy();
    });

    test('should update memory estimate after evictions', () => {
      const memCache = new TemplateCache({ maxSize: 2, enableLRU: true, ttl: 0 });

      memCache.setTemplate('k1', { data: 'x'.repeat(1000) });
      memCache.setTemplate('k2', { data: 'y'.repeat(1000) });

      const beforeStats = memCache.getStats();
      const beforeMem = beforeStats.memoryEstimate;

      expect(beforeMem).toBeGreaterThan(0);

      memCache.setTemplate('k3', { data: 'z'.repeat(100) }); // Evicts k1 or k2

      const afterStats = memCache.getStats();
      const afterMem = afterStats.memoryEstimate;

      // Memory estimate should change after eviction
      expect(afterMem).toBeLessThanOrEqual(beforeMem);
      expect(afterMem).toBeGreaterThan(0);

      memCache.destroy();
    });

    test('should use fallback estimation for circular references', () => {
      const cache = new TemplateCache({ ttl: 0 });

      // Create object with circular reference
      const circularObj = { data: 'test' };
      circularObj.self = circularObj; // Circular reference

      cache.setTemplate('circular', circularObj);

      const stats = cache.getStats();

      // Should still provide memory estimate using fallback
      expect(stats.memoryEstimate).toBeGreaterThan(0);
      expect(stats.memoryEstimate).toBe(1024); // Fallback is cache.size * 1024

      cache.destroy();
    });

    test('should clean expired entries from all cache types', () => {
      const ttlCache = new TemplateCache({ ttl: 1000 });
      ttlCache.stopCleanupTimer();

      // Add entries to all cache types
      ttlCache.setTemplate('t1', { data: 'template' });
      ttlCache.setDocument('d1', { data: 'document' });
      ttlCache.setData('data1', { value: 'test' });

      expect(ttlCache.templateCache.size).toBe(1);
      expect(ttlCache.documentCache.size).toBe(1);
      expect(ttlCache.dataCache.size).toBe(1);

      // Modify timestamps to simulate expiry
      for (const [, entry] of ttlCache.templateCache) {
        entry.timestamp = Date.now() - 2000;
      }
      for (const [, entry] of ttlCache.documentCache) {
        entry.timestamp = Date.now() - 2000;
      }
      for (const [, entry] of ttlCache.dataCache) {
        entry.timestamp = Date.now() - 2000;
      }

      const cleanedCount = ttlCache.cleanup();

      expect(cleanedCount).toBe(3); // All 3 entries should be cleaned
      expect(ttlCache.templateCache.size).toBe(0);
      expect(ttlCache.documentCache.size).toBe(0);
      expect(ttlCache.dataCache.size).toBe(0);

      ttlCache.destroy();
    });
  });

  describe('Additional Coverage Tests', () => {
    test('should trigger automatic cleanup timer', async () => {
      const autoCache = new TemplateCache({ ttl: 100, maxSize: 10 });

      // Add an entry
      autoCache.setTemplate('test', { data: 'value' });

      // Wait for cleanup timer to run (it runs every ttl/4)
      await new Promise(resolve => setTimeout(resolve, 150));

      // The cleanup timer should have run at least once
      expect(autoCache.cleanupTimer).not.toBeNull();

      autoCache.destroy();
    });

    test('should throw error for invalid cache type in getCacheStore', () => {
      const cache = new TemplateCache({ ttl: 0 });

      // Access private method via bracket notation to test error path
      expect(() => {
        cache.getCacheStore('invalid_type');
      }).toThrow('Invalid cache type');

      cache.destroy();
    });

    test('should clone Map values correctly', () => {
      const cache = new TemplateCache({ ttl: 0 });

      const mapValue = new Map();
      mapValue.set('key1', 'value1');
      mapValue.set('key2', { nested: 'value2' });

      cache.setTemplate('test', mapValue);
      const retrieved = cache.getTemplate('test');

      expect(retrieved).toBeInstanceOf(Map);
      expect(retrieved.get('key1')).toBe('value1');
      expect(retrieved.get('key2')).toEqual({ nested: 'value2' });
      expect(retrieved).not.toBe(mapValue); // Should be a clone

      cache.destroy();
    });
  });
});
