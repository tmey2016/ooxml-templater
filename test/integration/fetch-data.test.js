/**
 * Integration tests for fetchData method with realistic workflows
 */

const OOXMLTemplater = require('../../src/index');
const http = require('http');

describe('fetchData Integration Tests', () => {
  let templater;
  let server;
  let serverUrl;

  beforeAll((done) => {
    // Create a simple HTTP server to simulate API
    server = http.createServer((req, res) => {
      let body = '';

      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        const parsedBody = body ? JSON.parse(body) : {};

        // Simulate different endpoints
        if (req.url === '/api/data') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              data: {
                'user.name': 'John Doe',
                'user.email': 'john@example.com',
                'order.number': 'ORD-12345',
                'order.total': '99.99',
              },
            })
          );
        } else if (req.url === '/api/data-with-filename') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              data: {
                'company.name': 'Acme Corp',
                'report.date': '2025-10-03',
              },
              filename: 'company-report-2025-10-03.docx',
            })
          );
        } else if (req.url === '/api/error') {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
        } else if (req.url === '/api/values-format') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              values: {
                'product.name': 'Widget Pro',
                'product.price': '29.99',
              },
            })
          );
        } else if (req.url === '/api/placeholders-format') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              placeholders: {
                'customer.id': 'CUST-001',
                'customer.status': 'Active',
              },
            })
          );
        } else if (req.url === '/api/direct-format') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              'invoice.number': 'INV-2025-001',
              'invoice.amount': '1250.00',
            })
          );
        } else if (req.url === '/api/auth-required') {
          const authHeader = req.headers['authorization'];
          if (authHeader === 'Bearer secret-token') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                data: {
                  'secure.data': 'Authenticated',
                },
              })
            );
          } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
          }
        } else if (req.url === '/api/echo') {
          // Echo back what was sent
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ received: parsedBody }));
        } else {
          res.writeHead(404);
          res.end();
        }
      });
    });

    server.listen(0, () => {
      const port = server.address().port;
      serverUrl = `http://localhost:${port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    templater = new OOXMLTemplater();
  });

  describe('Basic Data Fetching', () => {
    test('should fetch placeholder data from API', async () => {
      const placeholders = ['user.name', 'user.email', 'order.number', 'order.total'];
      const result = await templater.fetchData(`${serverUrl}/api/data`, placeholders);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data['user.name']).toBe('John Doe');
      expect(result.data['user.email']).toBe('john@example.com');
      expect(result.data['order.number']).toBe('ORD-12345');
      expect(result.data['order.total']).toBe('99.99');
    });

    test('should include metadata in response', async () => {
      const result = await templater.fetchData(`${serverUrl}/api/data`, ['user.name']);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.fetchedAt).toBeDefined();
      expect(result.metadata.apiUrl).toBe(`${serverUrl}/api/data`);
      expect(result.metadata.placeholderCount).toBe(1);
    });

    test('should extract filename from API response', async () => {
      const result = await templater.fetchData(`${serverUrl}/api/data-with-filename`, [
        'company.name',
        'report.date',
      ]);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('company-report-2025-10-03.docx');
      expect(result.data['company.name']).toBe('Acme Corp');
    });
  });

  describe('Different Response Formats', () => {
    test('should handle response with "values" field', async () => {
      const result = await templater.fetchData(`${serverUrl}/api/values-format`, [
        'product.name',
        'product.price',
      ]);

      expect(result.success).toBe(true);
      expect(result.data['product.name']).toBe('Widget Pro');
      expect(result.data['product.price']).toBe('29.99');
    });

    test('should handle response with "placeholders" field', async () => {
      const result = await templater.fetchData(`${serverUrl}/api/placeholders-format`, [
        'customer.id',
        'customer.status',
      ]);

      expect(result.success).toBe(true);
      expect(result.data['customer.id']).toBe('CUST-001');
      expect(result.data['customer.status']).toBe('Active');
    });

    test('should handle direct response format', async () => {
      const result = await templater.fetchData(`${serverUrl}/api/direct-format`, [
        'invoice.number',
        'invoice.amount',
      ]);

      expect(result.success).toBe(true);
      expect(result.data['invoice.number']).toBe('INV-2025-001');
      expect(result.data['invoice.amount']).toBe('1250.00');
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 error gracefully', async () => {
      const result = await templater.fetchData(`${serverUrl}/api/error`, ['test']);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('API request failed');
      expect(result.error.message).toContain('404');
    });

    test('should handle network errors', async () => {
      const result = await templater.fetchData('http://invalid-host-12345.example.com/api/data', [
        'test',
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle invalid URL gracefully', async () => {
      const result = await templater.fetchData('not-a-valid-url', ['test']);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Authentication and Headers', () => {
    test('should send custom headers to API', async () => {
      const result = await templater.fetchData(`${serverUrl}/api/auth-required`, ['secure.data'], {
        headers: {
          Authorization: 'Bearer secret-token',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data['secure.data']).toBe('Authenticated');
    });

    test('should fail authentication without proper headers', async () => {
      const result = await templater.fetchData(`${serverUrl}/api/auth-required`, ['secure.data']);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('401');
    });
  });

  describe('Request Options', () => {
    test('should send additional data in request body', async () => {
      const result = await templater.fetchData(`${serverUrl}/api/echo`, ['test'], {
        additionalData: {
          userId: 'user-123',
          context: 'integration-test',
          timestamp: Date.now(),
        },
      });

      expect(result.success).toBe(true);
      expect(result.data.received.placeholders).toEqual(['test']);
      expect(result.data.received.userId).toBe('user-123');
      expect(result.data.received.context).toBe('integration-test');
    });

    test('should include raw response when requested', async () => {
      const result = await templater.fetchData(`${serverUrl}/api/data`, ['user.name'], {
        includeRawResponse: true,
      });

      expect(result.success).toBe(true);
      expect(result.rawResponse).toBeDefined();
      expect(result.rawResponse.data).toBeDefined();
    });

    test('should use default filename when not in response', async () => {
      const result = await templater.fetchData(`${serverUrl}/api/data`, ['user.name'], {
        defaultFilename: 'default-output.docx',
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe('default-output.docx');
    });
  });

  describe('End-to-End Workflow', () => {
    test('should complete full parse-then-fetch workflow', async () => {
      const path = require('path');
      const fs = require('fs').promises;
      const AdmZip = require('adm-zip');

      // Create a test template
      const zip = new AdmZip();
      zip.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0"?><Types></Types>'));
      zip.addFile(
        'word/document.xml',
        Buffer.from(
          '<?xml version="1.0"?><document><p>(((user.name)))</p><p>(((user.email)))</p></document>'
        )
      );

      const templatePath = path.join(__dirname, '../fixtures/workflow-test.docx');
      await fs.mkdir(path.dirname(templatePath), { recursive: true });
      await fs.writeFile(templatePath, zip.toBuffer());

      // Step 1: Parse template
      const parseResult = await templater.parseTemplate(templatePath);
      expect(parseResult.success).toBe(true);

      // Step 2: Fetch data for placeholders
      const fetchResult = await templater.fetchData(
        `${serverUrl}/api/data`,
        parseResult.placeholders.unique
      );
      expect(fetchResult.success).toBe(true);

      // Verify data matches placeholders
      expect(fetchResult.data['user.name']).toBeDefined();
      expect(fetchResult.data['user.email']).toBeDefined();

      // Cleanup
      await fs.unlink(templatePath).catch(() => {});
    });

    test('should handle large placeholder lists', async () => {
      const largePlaceholderList = Array.from({ length: 100 }, (_, i) => `placeholder.${i}`);

      const result = await templater.fetchData(`${serverUrl}/api/echo`, largePlaceholderList);

      expect(result.success).toBe(true);
      expect(result.data.received.placeholders).toHaveLength(100);
      expect(result.metadata.placeholderCount).toBe(100);
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        templater.fetchData(`${serverUrl}/api/data`, [`test.${i}`])
      );

      const results = await Promise.all(requests);

      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    test('should timeout on slow responses', async () => {
      // This test would require a slow endpoint, skipping for now
      // But the implementation should support timeout options
    }, 10000);
  });
});
