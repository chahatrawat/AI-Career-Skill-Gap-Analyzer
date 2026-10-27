'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { estimateLevel, evidenceStatus, shuffle } = require('./quiz');

test('estimateLevel maps the share of correct answers to 1-4', () => {
  assert.equal(estimateLevel(0, 3), 1);
  assert.equal(estimateLevel(1, 3), 2);
  assert.equal(estimateLevel(2, 3), 3);
  assert.equal(estimateLevel(3, 3), 4);
});

test('estimateLevel rejects impossible input', () => {
  assert.throws(() => estimateLevel(4, 3), RangeError);
  assert.throws(() => estimateLevel(0, 0), RangeError);
  assert.throws(() => estimateLevel(-1, 3), RangeError);
});

test('evidenceStatus compares self rating with the quiz estimate', () => {
  assert.equal(evidenceStatus(null, 3), 'unrated');
  assert.equal(evidenceStatus(2, 3), 'supported');
  assert.equal(evidenceStatus(3, 3), 'supported');
  assert.equal(evidenceStatus(4, 3), 'close');
  assert.equal(evidenceStatus(5, 2), 'overrated');
  assert.equal(evidenceStatus(4, 2), 'overrated');
});

test('a self rating of 5 is supported by the maximum quiz level 4', () => {
  assert.equal(evidenceStatus(5, 4), 'supported');
});

test('shuffle keeps all items and does not change the input', () => {
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(input);
  assert.deepEqual([...out].sort(), input);
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
});
