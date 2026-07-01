# EchoProof

EchoProof is an anonymous multiple-choice feedback and survey dApp for builder cohorts on Midnight Network.

The first target is a RiseIn "New Moon to Full: Monthly Moonshots" Level 3 submission. The dApp lets organizers collect feedback from verified participants while preserving respondent anonymity.

## Privacy Model

Observers, including organizers, can learn:

- The total number of valid responses.
- Public aggregate tallies for each multiple-choice option.
- That every accepted response came from a participant committed into the campaign's eligibility Merkle root.

Observers cannot learn:

- Which participant submitted a response.
- Whether a specific participant responded.
- Any link between a wallet address used for transaction fees and the private participant identity used for eligibility.

## Identity Model

Participant eligibility is based on generated enrollment secrets, not wallet public keys or email addresses.

At enrollment time, each participant receives a private secret. The organizer includes only commitments to those secrets in the campaign Merkle tree. During response submission, the participant proves that their secret is represented in the committed tree and derives a campaign-specific nullifier to prevent duplicate submissions.

Lace wallet is used for transaction signing and fees. It is not the ZK identity.

## Scope

Version 1 supports multiple-choice surveys only. Free-text responses and encrypted text are intentionally out of scope so the public response data remains simple, aggregate, and defensible for the demo.

## Repository Layout

```text
contracts/
  echoproof/
    src/
      EchoProof.compact
apps/
  web/
```


# Echoproof
