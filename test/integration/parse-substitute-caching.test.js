/**
 * Integration tests for caching between parseTemplate and substituteTemplate
 * Tests the "unzip once" efficiency requirement
 */

const OOXMLTemplater = require('../../src/index');
const fs = require('fs').promises;
const path = require('path');

describe('Parse-Substitute Caching Integration', () => {
  let templater;
  const testTemplatesDir = path.join(__dirname, '../test-templates');

  beforeEach(() => {
    templater = new OOXMLTemplater({
      cacheTemplates: true,
    });
  });

  afterEach(() => {
    if (templater && templater.clearCache) {
      templater.clearCache();
    }
  });

  describe('Template Data Caching', () => {
    test('should cache template data from parseTemplate for use in substituteTemplate', async () => {
      const templatePath = path.join(testTemplatesDir, 'sample-docx.docx');

      // Verify template exists
      try {
        await fs.access(templatePath);
      } catch (error) {
        console.warn(`Test template not found: ${templatePath}, skipping test`);
        return;
      }

      // Step 1: Parse template
      const parseResult = await templater.parseTemplate(templatePath);
      expect(parseResult.success).toBe(true);
      expect(parseResult.placeholders.unique).toBeDefined();
      expect(parseResult.metadata.cached).toBe(true);

      // Verify cache has the template data
      const cacheStats = templater.getCacheStats();
      expect(cacheStats.templateDataCache.size).toBe(1);
      expect(cacheStats.templateDataCache.entries).toHaveLength(1);
      expect(cacheStats.templateDataCache.entries[0].url).toBe(templatePath);

      // Step 2: Substitute template - should use cached data
      const testData = {
        name: 'Test User',
        company: 'Test Company',
        date: '2024-01-01',
      };

      const substResult = await templater.substituteTemplate(templatePath, testData);
      expect(substResult.success).toBe(true);
      expect(substResult.metadata.usedCache).toBe(true); // Should have used cache!

      // Cache size should remain 1
      const cacheStats2 = templater.getCacheStats();
      expect(cacheStats2.templateDataCache.size).toBe(1);
    });

    test('should work without cache if parseTemplate was not called first', async () => {
      const templatePath = path.join(testTemplatesDir, 'sample-docx.docx');

      try {
        await fs.access(templatePath);
      } catch (error) {
        console.warn(`Test template not found: ${templatePath}, skipping test`);
        return;
      }

      // Skip parseTemplate, go directly to substituteTemplate
      const testData = {
        name: 'Direct User',
        company: 'Direct Company',
      };

      const substResult = await templater.substituteTemplate(templatePath, testData);
      expect(substResult.success).toBe(true);
      expect(substResult.metadata.usedCache).toBe(false); // No cache available

      // Cache should now have 1 entry (cached during substituteTemplate)
      const cacheStats = templater.getCacheStats();
      expect(cacheStats.templateDataCache.size).toBe(1);
    });

    test('should handle multiple templates with separate caches', async () => {
      const template1 = path.join(testTemplatesDir, 'sample-docx.docx');
      const template2 = path.join(testTemplatesDir, 'sample-pptx.pptx');

      try {
        await fs.access(template1);
        await fs.access(template2);
      } catch (error) {
        console.warn('Test templates not found, skipping test');
        return;
      }

      // Parse both templates
      const parse1 = await templater.parseTemplate(template1);
      const parse2 = await templater.parseTemplate(template2);

      expect(parse1.success).toBe(true);
      expect(parse2.success).toBe(true);

      // Should have 2 cached entries
      const cacheStats = templater.getCacheStats();
      expect(cacheStats.templateDataCache.size).toBe(2);

      // Substitute both - should use cached data
      const data1 = { name: 'User 1' };
      const data2 = { title: 'Slide 1' };

      const subst1 = await templater.substituteTemplate(template1, data1);
      const subst2 = await templater.substituteTemplate(template2, data2);

      expect(subst1.success).toBe(true);
      expect(subst1.metadata.usedCache).toBe(true);
      expect(subst2.success).toBe(true);
      expect(subst2.metadata.usedCache).toBe(true);

      // Cache size should still be 2
      const cacheStats2 = templater.getCacheStats();
      expect(cacheStats2.templateDataCache.size).toBe(2);
    });

    test('should cache template data even when substituteTemplate is called first', async () => {
      const templatePath = path.join(testTemplatesDir, 'sample-docx.docx');

      try {
        await fs.access(templatePath);
      } catch (error) {
        console.warn(`Test template not found: ${templatePath}, skipping test`);
        return;
      }

      const testData = { name: 'Test User' };

      // First call to substituteTemplate (no cache)
      const subst1 = await templater.substituteTemplate(templatePath, testData);
      expect(subst1.success).toBe(true);
      expect(subst1.metadata.usedCache).toBe(false);

      // Second call to substituteTemplate (should use cache)
      const subst2 = await templater.substituteTemplate(templatePath, testData);
      expect(subst2.success).toBe(true);
      expect(subst2.metadata.usedCache).toBe(true);
    });
  });

  describe('Cache Management', () => {
    test('clearCache should remove specific template from cache', async () => {
      const templatePath = path.join(testTemplatesDir, 'sample-docx.docx');

      try {
        await fs.access(templatePath);
      } catch (error) {
        console.warn(`Test template not found: ${templatePath}, skipping test`);
        return;
      }

      // Parse template to cache it
      await templater.parseTemplate(templatePath);

      // Verify it's cached
      let cacheStats = templater.getCacheStats();
      expect(cacheStats.templateDataCache.size).toBe(1);

      // Clear specific template
      const clearResult = templater.clearCache(templatePath);
      expect(clearResult.success).toBe(true);
      expect(clearResult.cleared).toBe(1);
      expect(clearResult.templateUrl).toBe(templatePath);

      // Verify it's removed from cache
      cacheStats = templater.getCacheStats();
      expect(cacheStats.templateDataCache.size).toBe(0);
    });

    test('clearCache should remove all templates when no URL specified', async () => {
      const template1 = path.join(testTemplatesDir, 'sample-docx.docx');
      const template2 = path.join(testTemplatesDir, 'sample-pptx.pptx');

      try {
        await fs.access(template1);
        await fs.access(template2);
      } catch (error) {
        console.warn('Test templates not found, skipping test');
        return;
      }

      // Parse both templates
      await templater.parseTemplate(template1);
      await templater.parseTemplate(template2);

      // Verify both are cached
      let cacheStats = templater.getCacheStats();
      expect(cacheStats.templateDataCache.size).toBe(2);

      // Clear all caches
      const clearResult = templater.clearCache();
      expect(clearResult.success).toBe(true);
      expect(clearResult.cleared).toBe(2);

      // Verify all are removed
      cacheStats = templater.getCacheStats();
      expect(cacheStats.templateDataCache.size).toBe(0);
    });

    test('getCacheStats should return detailed cache information', async () => {
      const templatePath = path.join(testTemplatesDir, 'sample-docx.docx');

      try {
        await fs.access(templatePath);
      } catch (error) {
        console.warn(`Test template not found: ${templatePath}, skipping test`);
        return;
      }

      // Parse template
      const parseResult = await templater.parseTemplate(templatePath);

      // Get cache stats
      const stats = templater.getCacheStats();

      expect(stats.templateDataCache).toBeDefined();
      expect(stats.templateDataCache.size).toBe(1);
      expect(stats.templateDataCache.entries).toHaveLength(1);

      const entry = stats.templateDataCache.entries[0];
      expect(entry.url).toBe(templatePath);
      expect(entry.cachedAt).toBeGreaterThan(0);
      expect(entry.age).toBeGreaterThanOrEqual(0);
      expect(entry.xmlFileCount).toBeGreaterThan(0);
      expect(entry.placeholderCount).toBe(parseResult.placeholders.unique.length);

      // Should also include TemplateCache stats
      expect(stats.templateCache).toBeDefined();
      expect(stats.templateCache.hits).toBeGreaterThanOrEqual(0);
      expect(stats.templateCache.misses).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cache Disabled', () => {
    test('should not cache when cacheTemplates option is false', async () => {
      const noCacheTemplater = new OOXMLTemplater({
        cacheTemplates: false,
      });

      const templatePath = path.join(testTemplatesDir, 'sample-docx.docx');

      try {
        await fs.access(templatePath);
      } catch (error) {
        console.warn(`Test template not found: ${templatePath}, skipping test`);
        return;
      }

      // Parse template
      await noCacheTemplater.parseTemplate(templatePath);

      // Cache should be empty
      const cacheStats = noCacheTemplater.getCacheStats();
      expect(cacheStats.templateDataCache.size).toBe(0);

      // Substitute should not use cache
      const testData = { name: 'Test' };
      const substResult = await noCacheTemplater.substituteTemplate(templatePath, testData);
      expect(substResult.success).toBe(true);
      expect(substResult.metadata.usedCache).toBe(false);

      // Cache should still be empty
      const cacheStats2 = noCacheTemplater.getCacheStats();
      expect(cacheStats2.templateDataCache.size).toBe(0);
    });
  });

  describe('Performance Benefits', () => {
    test('should demonstrate performance improvement from caching', async () => {
      const templatePath = path.join(testTemplatesDir, 'sample-docx.docx');

      try {
        await fs.access(templatePath);
      } catch (error) {
        console.warn(`Test template not found: ${templatePath}, skipping test`);
        return;
      }

      const testData = { name: 'Performance Test', company: 'Test Corp' };

      // First call - no cache (parse + substitute)
      const start1 = Date.now();
      await templater.parseTemplate(templatePath);
      const subst1 = await templater.substituteTemplate(templatePath, testData);
      const time1 = Date.now() - start1;

      expect(subst1.success).toBe(true);
      expect(subst1.metadata.usedCache).toBe(true);

      // Clear cache and measure without caching
      templater.clearCache();

      // Second call - no cache benefit
      const start2 = Date.now();
      const subst2 = await templater.substituteTemplate(templatePath, testData);
      const time2 = Date.now() - start2;

      expect(subst2.success).toBe(true);
      expect(subst2.metadata.usedCache).toBe(false);

      // Third call - with cache benefit
      const start3 = Date.now();
      const subst3 = await templater.substituteTemplate(templatePath, testData);
      const time3 = Date.now() - start3;

      expect(subst3.success).toBe(true);
      expect(subst3.metadata.usedCache).toBe(true);

      // Cached call should be faster or at least not significantly slower
      console.log(`Performance: No cache: ${time2}ms, With cache: ${time3}ms`);
      expect(time3).toBeLessThanOrEqual(time2 + 50); // Allow some variance
    });
  });

  describe('processTemplate Integration', () => {
    test('processTemplate should benefit from internal caching', async () => {
      const templatePath = path.join(testTemplatesDir, 'sample-docx.docx');

      try {
        await fs.access(templatePath);
      } catch (error) {
        console.warn(`Test template not found: ${templatePath}, skipping test`);
        return;
      }

      const testData = {
        name: 'Process Test',
        company: 'Test Company',
      };

      // First processTemplate call
      const result1 = await templater.processTemplate(templatePath, testData);
      expect(result1.success).toBe(true);

      // Template should now be cached
      const cacheStats = templater.getCacheStats();
      expect(cacheStats.templateDataCache.size).toBe(1);

      // Second processTemplate call - should use cache internally
      const result2 = await templater.processTemplate(templatePath, testData);
      expect(result2.success).toBe(true);

      // The internal substituteTemplate call should have used cache
      // (We can't directly verify this without refactoring, but the cache should still exist)
      const cacheStats2 = templater.getCacheStats();
      expect(cacheStats2.templateDataCache.size).toBe(1);
    });
  });
});
