import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import { buildProof, buildRoot, EchoProofSimulator, participantLeaf } from './helpers.mjs';

test('duplicate nullifier is rejected', () => {
  const secret = randomBytes(32);
  const leaves = [participantLeaf(secret)];
  const root = buildRoot(leaves);
  const proof = buildProof(leaves, 0);
  const simulator = new EchoProofSimulator({
    eligibleRoot: root,
    surveyId: randomBytes(32),
    optionCount: 2,
  });

  simulator.submit({ secret, proof, option: 0 });

  assert.throws(
    () => simulator.submit({ secret, proof, option: 1 }),
    /duplicate response/,
  );
});
