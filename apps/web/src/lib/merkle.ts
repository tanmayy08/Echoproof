const encoder = new TextEncoder();

export type MerkleProofStep = {
  sibling: string;
  siblingIsLeft: boolean;
};

export type CampaignProof = {
  participantLeaf: string;
  merkleRoot: string;
  proof: MerkleProofStep[];
};

function bytesToHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]*$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error('Expected an even-length hex value.');
  }
  return Uint8Array.from(normalized.match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? []);
}

function pad32(label: string): Uint8Array {
  const encoded = encoder.encode(label);
  const output = new Uint8Array(32);
  output.set(encoded.slice(0, 32));
  return output;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

async function digest(parts: Uint8Array[]): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', concat(parts));
  return bytesToHex(new Uint8Array(hash));
}

export function parseSecretList(input: string): Uint8Array[] {
  return input
    .split(/\s|,|;/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      const bytes = hexToBytes(value);
      if (bytes.length !== 32) {
        throw new Error('Each enrollment secret must be exactly 32 bytes.');
      }
      return bytes;
    });
}

export async function participantLeaf(secret: Uint8Array): Promise<string> {
  return digest([pad32('echoproof:participant:v1'), secret]);
}

export async function merkleNode(left: string, right: string): Promise<string> {
  return digest([pad32('echoproof:merkle:v1'), hexToBytes(left), hexToBytes(right)]);
}

export async function responseNullifier(secret: Uint8Array, surveyId: string): Promise<string> {
  return digest([pad32('echoproof:nullifier:v1'), secret, hexToBytes(surveyId)]);
}

export async function buildMerkleRoot(leaves: string[], depth = 8): Promise<string> {
  const zeroLeaf = await participantLeaf(new Uint8Array(32));
  let level = Array.from({ length: 2 ** depth }, (_, index) => leaves[index] ?? zeroLeaf);
  while (level.length > 1) {
    const next: string[] = [];
    for (let index = 0; index < level.length; index += 2) {
      next.push(await merkleNode(level[index], level[index + 1]));
    }
    level = next;
  }
  return level[0];
}

export async function buildCampaignRootFromSecrets(secretInput: string): Promise<string> {
  const secrets = parseSecretList(secretInput);
  if (secrets.length === 0 || secrets.length > 256) {
    throw new Error('Campaigns require 1 to 256 enrollment secrets.');
  }
  const leaves = await Promise.all(secrets.map(participantLeaf));
  return buildMerkleRoot(leaves);
}

export async function buildCampaignProof(secretInput: string, participantIndex: number): Promise<CampaignProof> {
  const secrets = parseSecretList(secretInput);
  if (participantIndex < 0 || participantIndex >= secrets.length) {
    throw new Error('Participant index is outside the enrollment list.');
  }

  const zeroLeaf = await participantLeaf(new Uint8Array(32));
  let index = participantIndex;
  let level = Array.from({ length: 256 }, (_, leafIndex) => zeroLeaf);
  const enrollmentLeaves = await Promise.all(secrets.map(participantLeaf));
  enrollmentLeaves.forEach((leaf, leafIndex) => {
    level[leafIndex] = leaf;
  });

  const proof: MerkleProofStep[] = [];
  while (level.length > 1) {
    const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
    proof.push({
      sibling: level[siblingIndex],
      siblingIsLeft: index % 2 === 1,
    });

    const next: string[] = [];
    for (let leafIndex = 0; leafIndex < level.length; leafIndex += 2) {
      next.push(await merkleNode(level[leafIndex], level[leafIndex + 1]));
    }
    level = next;
    index = Math.floor(index / 2);
  }

  return {
    participantLeaf: enrollmentLeaves[participantIndex],
    merkleRoot: level[0],
    proof,
  };
}
