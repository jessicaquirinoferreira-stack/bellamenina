import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rules = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');

test('firestore.rules enforces rules_version 2 and default deny safety net', () => {
  assert.match(rules, /rules_version\s*=\s*'2'/);
  assert.match(rules, /match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s*false;/);
});

test('firestore.rules enforces PII isolation on customers, orders, and immutable adminLogs', () => {
  assert.match(rules, /match\s+\/customers\/\{customerId\}[\s\S]*allow\s+get:\s*if\s*isValidId\(customerId\)\s*&&\s*\(isOwner\(customerId\)\s*\|\|\s*isAdmin\(\)\);/);
  assert.match(rules, /match\s+\/customers\/\{customerId\}[\s\S]*allow\s+list:\s*if\s*isAdmin\(\);/);
  assert.match(rules, /match\s+\/orders\/\{orderId\}[\s\S]*allow\s+get:\s*if\s*isValidId\(orderId\)\s*&&\s*\(isAdmin\(\)\s*\|\|\s*\(isSignedIn\(\)\s*&&\s*existing\(\)\.customerId\s*==\s*request\.auth\.uid\)\);/);
  assert.match(rules, /match\s+\/adminLogs\/\{logId\}[\s\S]*allow\s+update,\s*delete:\s*if\s*false;/);
});

test('firestore.rules validates every collection schema including dynamic categories, isValidId, and request.time', () => {
  for (const fn of [
    'isValidId',
    'isValidCategory',
    'isValidProduct',
    'isValidCustomer',
    'isValidWaitlist',
    'isValidOrder',
    'isValidCoupon',
    'isValidSettings',
    'isValidFeedback',
    'isValidAdminLog',
  ]) {
    assert.ok(rules.includes(`function ${fn}(`), `Missing helper ${fn}`);
  }
  assert.match(rules, /match\s+\/categories\/\{categoryId\}/);
  assert.match(rules, /data\.category\s+is\s+string\s+&&\s+data\.category\.size\(\)\s*>=\s*2\s+&&\s+data\.category\.size\(\)\s*<=\s*60/);
  assert.match(rules, /'category'/);
  assert.match(rules, /request\.time/);
  assert.match(rules, /email_verified\s*==\s*true/);
});
