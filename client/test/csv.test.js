import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, looksLikeLeads } from '../src/csv.js';

test('parses a simple CSV', () => {
  const { columns, rows } = parseCsv('Name,City\nAcme,Boise\nBeta,Tulsa\n');
  assert.deepEqual(columns, ['Name', 'City']);
  assert.deepEqual(rows, [{ Name: 'Acme', City: 'Boise' }, { Name: 'Beta', City: 'Tulsa' }]);
});

test('handles quotes, commas, escaped quotes and newlines inside fields', () => {
  const { rows } = parseCsv('Name,Note\n"Smith, Jones & Co","He said ""hi""\nthere"\n');
  assert.equal(rows[0].Name, 'Smith, Jones & Co');
  assert.equal(rows[0].Note, 'He said "hi"\nthere');
});

test('handles CRLF line endings, a BOM and blank lines', () => {
  const { columns, rows } = parseCsv('﻿Name,City\r\nAcme,Boise\r\n\r\nBeta,Tulsa');
  assert.deepEqual(columns, ['Name', 'City']);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].City, 'Tulsa');
});

test('fills missing cells with empty strings and trims values', () => {
  const { rows } = parseCsv('A,B,C\n 1 ,2\n');
  assert.deepEqual(rows[0], { A: '1', B: '2', C: '' });
});

test('empty input gives no rows', () => {
  assert.deepEqual(parseCsv(''), { columns: [], rows: [] });
  assert.deepEqual(parseCsv('\n\n'), { columns: [], rows: [] });
});

test('looksLikeLeads needs a name or website column', () => {
  assert.equal(looksLikeLeads(['Business Name', 'City']), true);
  assert.equal(looksLikeLeads(['id', 'website']), true);
  assert.equal(looksLikeLeads(['mmwr_week', 'respiratory_category', 'percent']), false);
});
