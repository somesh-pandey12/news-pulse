import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 90;

export default function RefreshButton({ onComplete }) {
  const [state, setState] = useState('idle');
  const [message, setMessage] = useState('');
  const pollCount = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const poll = async (jobId) => {
    if (pollCount.current >= MAX_POLLS) {
      setState('error');
      setMessage('Timed out waiting for the pipeline to finish.');
      return;
    }
    pollCount.current += 1;

    try {
      const job = await api.getIngestStatus(jobId);
      if (job.status === 'done') {
        setState('done');
        setMessage(job.message || 'Refreshed.');
        onComplete();
        return;
      }
      if (job.status === 'error') {
        setState('error');
        setMessage(job.message || 'Pipeline failed.');
        return;
      }
      setMessage(job.message || 'Working...');
      timerRef.current = setTimeout(() => poll(jobId), POLL_INTERVAL_MS);
    } catch (err) {
      setState('error');
      setMessage(err.message);
    }
  };

  const handleClick = async () => {
    setState('running');
    setMessage('Starting pipeline...');
    pollCount.current = 0;
    try {
      const { jobId } = await api.triggerIngest();
      poll(jobId);
    } catch (err) {
      setState('error');
      setMessage(err.message);
    }
  };

  return (
    <div>
      <button
        className="border-[1.5px] border-ink bg-paper-raised text-ink px-[18px] py-2.5 text-sm font-medium rounded cursor-pointer whitespace-nowrap transition-colors hover:enabled:bg-ink hover:enabled:text-paper disabled:opacity-60 disabled:cursor-default"
        onClick={handleClick}
        disabled={state === 'running'}
      >
        {state === 'running' ? 'Refreshing…' : 'Refresh data'}
      </button>
      {message && (
        <div className={`text-[0.82rem] mt-1.5 min-h-[1.2em] ${state === 'error' ? 'text-wire-red' : 'text-ink-soft'}`}>
          {message}
        </div>
      )}
    </div>
  );
}