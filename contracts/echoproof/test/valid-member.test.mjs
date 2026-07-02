import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import { buildProof, buildRoot, calculateRootFromProof, EchoProofSimulator, participantLeaf } from './helpers.mjs';

test('valid member submits successfully', () => {
  const secrets = [randomBytes(32), randomBytes(32), randomBytes(32)];
  const leaves = secrets.map(participantLeaf);
  const root = buildRoot(leaves);
  const proof = buildProof(leaves, 1);
  const simulator = new EchoProofSimulator({
    eligibleRoot: root,
    surveyId: randomBytes(32),
    optionCount: 3,
  });

  simulator.submit({ secret: secrets[1], proof, option: 2 });

  assert.equal(simulator.responseCount, 1);
  assert.equal(simulator.tallies[2], 1);
  assert.equal(calculateRootFromProof(secrets[1], proof), root);
});
