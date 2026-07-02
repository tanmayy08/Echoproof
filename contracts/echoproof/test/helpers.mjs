import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const pad32 = (value) => Buffer.concat([Buffer.from(value), Buffer.alloc(32)]).subarray(0, 32);
const hash = (...parts) => createHash('sha256').update(Buffer.concat(parts)).digest('hex');

export const participantLeaf = (secret) => hash(pad32('echoproof:participant:v1'), secret);
export const merkleNode = (left, right) => hash(pad32('echoproof:merkle:v1'), Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
export const responseNullifier = (secret, surveyId) => hash(pad32('echoproof:nullifier:v1'), secret, surveyId);

export function merkleStep(current, sibling, siblingIsLeft) {
  return siblingIsLeft ? merkleNode(sibling, current) : merkleNode(current, sibling);
}

function normalizeLeaves(leaves, depth = 8) {
  const targetSize = 2 ** depth;
  const zeroLeaf = participantLeaf(Buffer.alloc(32));
  return Array.from({ length: targetSize }, (_, index) => leaves[index] ?? zeroLeaf);
}

export function buildRoot(leaves, depth = 8) {
  let level = normalizeLeaves(leaves, depth);
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(merkleNode(level[i], level[i + 1]));
    }
    level = next;
  }
  return level[0];
}

export function buildProof(leaves, leafIndex, depth = 8) {
  let index = leafIndex;
  let level = [...leaves];
  level = normalizeLeaves(level, depth);
  const proof = [];

  while (level.length > 1) {
    const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
    proof.push({
      sibling: level[siblingIndex],
      siblingIsLeft: index % 2 === 1,
    });

    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(merkleNode(level[i], level[i + 1]));
    }
    level = next;
    index = Math.floor(index / 2);
  }

  return proof;
}

export function calculateRootFromProof(secret, proof) {
  return proof.reduce(
    (current, step) => merkleStep(current, step.sibling, step.siblingIsLeft),
    participantLeaf(secret),
  );
}

export class EchoProofSimulator {
  constructor({ eligibleRoot, surveyId, optionCount }) {
    this.eligibleRoot = eligibleRoot;
    this.surveyId = surveyId;
    this.optionCount = optionCount;
    this.responseCount = 0;
    this.nullifiers = new Set();
    this.tallies = Array.from({ length: 5 }, () => 0);
  }

  submit({ secret, proof, option }) {
    const provenRoot = calculateRootFromProof(secret, proof);
    assert.equal(provenRoot, this.eligibleRoot, 'EchoProof: invalid membership proof');
    assert.ok(option < this.optionCount, 'EchoProof: invalid option');

    const nullifier = responseNullifier(secret, this.surveyId);
    assert.equal(this.nullifiers.has(nullifier), false, 'EchoProof: duplicate response');

    this.nullifiers.add(nullifier);
    this.responseCount += 1;
    this.tallies[option] += 1;
    return nullifier;
  }
}
