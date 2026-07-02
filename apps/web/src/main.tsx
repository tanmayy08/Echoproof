import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CheckCircle2, ClipboardList, LockKeyhole, Radio, ShieldCheck, Wallet } from 'lucide-react';
import { prepareSubmission, type PreparedSubmission } from './lib/echoproof';
import { buildCampaignRootFromSecrets, parseSecretList } from './lib/merkle';
import { connectLaceWallet } from './lib/wallet';
import './styles.css';

type WalletState = {
  status: 'idle' | 'connecting' | 'connected' | 'missing' | 'error';
  address: string;
  error: string;
};

type CampaignDraft = {
  surveyId: string;
  questionHash: string;
  merkleRoot: string;
  optionCount: number;
};

const initialCampaign: CampaignDraft = {
  surveyId: '0x72697365696e2d71312d666565646261636b0000000000000000000000000000',
  questionHash: '0xquestion-set-hash',
  merkleRoot: '',
  optionCount: 4,
};

const sampleSecrets = [
  '0x1000000000000000000000000000000000000000000000000000000000000001',
  '0x2000000000000000000000000000000000000000000000000000000000000002',
  '0x3000000000000000000000000000000000000000000000000000000000000003',
].join('\n');

function App() {
  const [wallet, setWallet] = useState<WalletState>({ status: 'idle', address: '', error: '' });
  const [campaign, setCampaign] = useState<CampaignDraft>(initialCampaign);
  const [selectedOption, setSelectedOption] = useState(0);
  const [enrollmentSecrets, setEnrollmentSecrets] = useState(sampleSecrets);
  const [participantIndex, setParticipantIndex] = useState(0);
  const [participantSecret, setParticipantSecret] = useState(sampleSecrets.split('\n')[0]);
  const [prepared, setPrepared] = useState<PreparedSubmission | null>(null);
  const [formError, setFormError] = useState('');

  const options = useMemo(
    () => Array.from({ length: campaign.optionCount }, (_, index) => `Option ${index + 1}`),
    [campaign.optionCount],
  );

  async function connectWallet() {
    setWallet({ status: 'connecting', address: '', error: '' });
    try {
      const connection = await connectLaceWallet();
      setWallet({ status: 'connected', address: connection.address, error: '' });
    } catch (error) {
      setWallet({
        status: error instanceof Error && error.message.includes('not detected') ? 'missing' : 'error',
        address: '',
        error: error instanceof Error ? error.message : 'Wallet connection rejected.',
      });
    }
  }

  async function deriveRoot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    setPrepared(null);

    try {
      const merkleRoot = await buildCampaignRootFromSecrets(enrollmentSecrets);
      setCampaign((current) => ({ ...current, merkleRoot }));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to derive Merkle root.');
    }
  }

  async function submitResponse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    setPrepared(null);

    try {
      const [secret] = parseSecretList(participantSecret);
      if (!secret) {
        throw new Error('Participant secret is required.');
      }
      const submission = await prepareSubmission({
        enrollmentSecrets,
        participantIndex,
        participantSecret: secret,
        surveyIdHex: campaign.surveyId,
        selectedOption,
      });
      if (campaign.merkleRoot && submission.merkleRoot !== campaign.merkleRoot) {
        throw new Error('Participant proof root does not match the campaign root.');
      }
      setPrepared(submission);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to prepare response.');
    }
  }

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <h1>EchoProof</h1>
          <p>Anonymous multiple-choice feedback for verified builder cohorts.</p>
        </div>
        <button className="button primary" onClick={connectWallet} type="button">
          <Wallet size={18} />
          {wallet.status === 'connected' ? 'Connected' : 'Connect Lace'}
        </button>
      </section>

      {wallet.status !== 'idle' && (
        <section className={`notice ${wallet.status}`}>
          {wallet.status === 'connected' ? wallet.address : wallet.error || 'Connecting wallet...'}
        </section>
      )}

      <section className="grid">
        <form className="panel" onSubmit={deriveRoot}>
          <div className="panel-heading">
            <ClipboardList size={20} />
            <h2>Organizer Campaign</h2>
          </div>
          <label>
            Survey ID
            <input value={campaign.surveyId} onChange={(event) => setCampaign({ ...campaign, surveyId: event.target.value })} />
          </label>
          <label>
            Question Set Hash
            <input value={campaign.questionHash} onChange={(event) => setCampaign({ ...campaign, questionHash: event.target.value })} />
          </label>
          <label>
            Eligibility Merkle Root
            <input readOnly value={campaign.merkleRoot || 'derive from enrollment secrets'} />
          </label>
          <label>
            Options
            <input
              max={5}
              min={2}
              type="number"
              value={campaign.optionCount}
              onChange={(event) => setCampaign({ ...campaign, optionCount: Number(event.target.value) })}
            />
          </label>
          <label>
            Enrollment Secrets
            <textarea value={enrollmentSecrets} onChange={(event) => setEnrollmentSecrets(event.target.value)} />
          </label>
          <button className="button primary full" type="submit">
            <ShieldCheck size={18} />
            Derive Merkle Root
          </button>
        </form>

        <form className="panel" onSubmit={submitResponse}>
          <div className="panel-heading">
            <ShieldCheck size={20} />
            <h2>Participant Response</h2>
          </div>
          <label>
            Enrollment Secret
            <input
              placeholder="32-byte secret from organizer"
              value={participantSecret}
              onChange={(event) => setParticipantSecret(event.target.value)}
            />
          </label>
          <label>
            Participant Index
            <input
              min={0}
              type="number"
              value={participantIndex}
              onChange={(event) => setParticipantIndex(Number(event.target.value))}
            />
          </label>
          <div className="option-list">
            {options.map((label, index) => (
              <button
                className={selectedOption === index ? 'option selected' : 'option'}
                key={label}
                onClick={() => setSelectedOption(index)}
                type="button"
              >
                <Radio size={16} />
                {label}
              </button>
            ))}
          </div>
          <button className="button primary full" type="submit">
            <LockKeyhole size={18} />
            Prove Eligibility and Submit
          </button>
          {prepared && (
            <p className="success">
              <CheckCircle2 size={18} />
              Prepared option {prepared.selectedOption + 1} with {prepared.proofLength} Merkle siblings.
            </p>
          )}
        </form>
      </section>
      {formError && <section className="notice error">{formError}</section>}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
