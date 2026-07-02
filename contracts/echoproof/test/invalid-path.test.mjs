import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import { buildProof, buildRoot, EchoProofSimulator, participantLeaf } from './helpers.mjs';

test('tampered Merkle path is rejected', () => {
  const secrets = [randomBytes(32), randomBytes(32), randomBytes(32), randomBytes(32)];
  const leaves = secrets.map(participantLeaf);
  const root = buildRoot(leaves);
  const proof = buildProof(leaves, 2);
  proof[0] = { ...proof[0], siblingIsLeft: !proof[0].siblingIsLeft };

  const simulator = new EchoProofSimulator({
    eligibleRoot: root,
    surveyId: randomBytes(32),
    optionCount: 4,
  });

  assert.throws(
    () => simulator.submit({ secret: secrets[2], proof, option: 3 }),
    /invalid membership proof/,
  );
});
