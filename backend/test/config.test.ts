import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

test('configuration rejects a missing Dify API key', () => {
  assert.throws(
    () => loadConfig({ DIFY_BASE_URL: 'http://localhost/v1', DIFY_API_KEY: '' }),
    /DIFY_API_KEY/
  );
});

test('configuration parses the required service settings', () => {
  const config = loadConfig({
    DIFY_BASE_URL: 'http://localhost/v1/',
    DIFY_API_KEY: 'secret',
    MYSQL_URL: 'mysql://user:pass@localhost:3306/customer_service',
    PORT: '4100'
  });

  assert.equal(config.difyBaseUrl, 'http://localhost/v1');
  assert.equal(config.port, 4100);
  assert.equal(config.mysqlUrl, 'mysql://user:pass@localhost:3306/customer_service');
});
