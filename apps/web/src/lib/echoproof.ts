import { buildCampaignProof, responseNullifier } from './merkle';

export type PreparedSubmission = {
  participantLeaf: string;
  merkleRoot: string;
  nullifier: string;
  proofLength: number;
  selectedOption: number;
};

export async function prepareSubmission(input: {
  enrollmentSecrets: string;
  participantIndex: number;
  participantSecret: Uint8Array;
  surveyIdHex: string;
  selectedOption: number;
}): Promise<PreparedSubmission> {
  const proof = await buildCampaignProof(input.enrollmentSecrets, input.participantIndex);
  const nullifier = await responseNullifier(input.participantSecret, input.surveyIdHex);

  return {
    participantLeaf: proof.participantLeaf,
    merkleRoot: proof.merkleRoot,
    nullifier,
    proofLength: proof.proof.length,
    selectedOption: input.selectedOption,
  };
}
