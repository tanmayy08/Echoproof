import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import { buildProof, buildRoot, EchoProofSimulator, participantLeaf } from './helpers.mjs';

test('non-member proof is rejected', () => {
  const secrets = [randomBytes(32), randomBytes(32)];
  const leaves = secrets.map(participantLeaf);
  const root = buildRoot(leaves);
  const proof = buildProof(leaves, 0);
  const simulator = new EchoProofSimulator({
    eligibleRoot: root,
    surveyId: randomBytes(32),
    optionCount: 2,
  });

  assert.throws(
    () => simulator.submit({ secret: randomBytes(32), proof, option: 1 }),
    /invalid membership proof/,
  );
});
