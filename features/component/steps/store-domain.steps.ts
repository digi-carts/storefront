import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import { canonicalStoreSlug } from '../../../lib/store-domain';

let slug = '';

When('I canonicalize host {string}', function (host: string) {
  slug = canonicalStoreSlug(host);
});

Then('the store slug is {string}', function (expected: string) {
  assert.equal(slug, expected);
});
