import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios.js';
import CodeEditor from '../components/CodeEditor.jsx';
import Timer from '../components/Timer.jsx';

export default function Contest() {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true });
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const draftTimer = useRef(null);

  const loadProblem = useCallback(async () => {
    setResult(null);
    setSubmissionHistory([]);
    try {
      const res = await api.get(`/contests/${contestId}/current-problem`);
      if (res.data.done || res.data.runStatus === 'completed') {
        navigate(`/leaderboard/${contestId}`);
        return;
      }
      setState({ loading: false, problem: res.data.problem, attempt: res.data.attempt, error: null });
      setCode(res.data.attempt?.draft_code || res.data.problem?.starter_code || '');
    } catch (err) {
      console.error(err);
      setState({ loading: false, error: 'Failed to load problem' });
    }
  }, [contestId, navigate]);

  useEffect(() => { loadProblem(); }, [loadProblem]);

  // Auto-save the draft every 5s while an attempt (timer) is active.
  useEffect(() => {
    if (!state.attempt || state.loading) return;
    draftTimer.current = setInterval(() => {
      api.put(`/contests/${contestId}/problems/${state.problem?.id}/draft`, { code }).catch(() => {});
    }, 5000);
    return () => clearInterval(draftTimer.current);
  }, [state.attempt, state.problem, code, contestId, state.loading]);

  const handleExpire = useCallback(async () => {
    if (!state.problem) return;
    try {
      await api.post(`/contests/${contestId}/problems/${state.problem.id}/timeout`);
    } catch (e) {
      console.error(e);
    }
    setResult({ error: '⏱️ 7-Minute Time Limit Expired! Moving to the next question...' });
    setTimeout(() => {
      loadProblem();
    }, 2000);
  }, [contestId, state.problem, loadProblem]);

  const handleSubmit = useCallback(async () => {
    if (submitting || !state.problem) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await api.post(
        `/contests/${contestId}/problems/${state.problem.id}/submit`,
        { code }
      );
      const subRes = res.data;
      setResult(subRes);
      
      // Keep track of attempt history
      setSubmissionHistory((prev) => [
        {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          verdict: subRes.verdict,
          testsPassed: subRes.testsPassed,
          testsTotal: subRes.testsTotal,
          log: subRes.log,
        },
        ...prev,
      ]);

      // ONLY advance if passed!
      if (subRes.passed) {
        setTimeout(() => {
          loadProblem();
        }, 2000);
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Submission failed';
      setResult({ error: errMsg });
      if (err.response?.data?.expired) {
        setTimeout(loadProblem, 2000);
      }
    } finally {
      setSubmitting(false);
    }
  }, [contestId, state.problem, code, submitting, loadProblem]);

  if (state.loading) return <div className="loading" style={{ padding: '2rem', textAlign: 'center' }}>Loading problem…</div>;
  if (state.error) return <div className="error" style={{ padding: '2rem' }}>{state.error}</div>;

  const { problem, attempt } = state;

  return (
    <div className="contest-page">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2>
            Problem {problem.sequence_no}/5 — {problem.title}
            <span className={`badge badge-${problem.difficulty}`}>{problem.difficulty} · {problem.points} pts</span>
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {attempt && <Timer deadlineAt={attempt.deadline_at} onExpire={handleExpire} />}
          <Link to={`/dashboard`} style={{ color: '#8b9bb4', fontSize: '0.9rem', textDecoration: 'none' }}>← Dashboard</Link>
        </div>
      </header>

      <section className="statement" dangerouslySetInnerHTML={{ __html: renderMarkdownLite(problem.statement_md) }} />

      <div className="editor-section">
        <CodeEditor value={code} onChange={setCode} readOnly={submitting} />

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '0.75rem 1.75rem',
              fontSize: '1rem',
              fontWeight: 'bold',
              background: submitting ? '#3b4252' : '#4f8cff',
            }}
          >
            {submitting ? 'Compiling & Running Testbench…' : 'Submit Solution'}
          </button>
          {result?.passed && (
            <button
              onClick={loadProblem}
              style={{ padding: '0.75rem 1.5rem', background: '#35c377', color: 'white', fontWeight: 'bold' }}
            >
              Next Problem →
            </button>
          )}
        </div>

        {/* Submission Result / Feedback Panel */}
          {result && !result.error && (
            <div
              className={`result result-${result.verdict}`}
              style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                borderRadius: '8px',
                border: `1px solid ${result.passed ? '#35c377' : '#ef4c5b'}`,
                background: result.passed ? 'rgba(53, 195, 119, 0.1)' : 'rgba(239, 76, 91, 0.1)',
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem 0', color: result.passed ? '#35c377' : '#ef4c5b' }}>
                {result.passed
                  ? '🎉 All Testcases Passed!'
                  : result.verdict === 'compile_error'
                  ? '⚠️ Compilation Error'
                  : '❌ Testcase Failure — Retries Remaining'}
              </h3>
              <p style={{ margin: '0.25rem 0 0.75rem 0', fontSize: '0.95rem' }}>
                Verdict: <strong>{result.verdict.toUpperCase()}</strong> ({result.testsPassed}/{result.testsTotal} testcases passed) — +{result.pointsAwarded} pts
              </p>
              {!result.passed && (
                <p style={{ color: '#ffa07a', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Your code was not accepted. Please fix the logic or syntax errors below and click "Submit Solution" again.
                </p>
              )}
              {result.passed && (
                <p style={{ color: '#35c377', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Great job! Moving to the next problem in 2 seconds...
                </p>
              )}
              {result.log && (
                <pre style={{
                  background: '#0d1017',
                  padding: '1rem',
                  borderRadius: '6px',
                  overflowX: 'auto',
                  fontSize: '0.85rem',
                  color: '#e6e8ee',
                  whiteSpace: 'pre-wrap',
                }}>
                  {result.log}
                </pre>
              )}
            </div>
          )}

          {result?.error && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(239, 76, 91, 0.2)', border: '1px solid #ef4c5b', borderRadius: '8px' }}>
              <p className="error" style={{ margin: 0, fontWeight: 'bold' }}>{result.error}</p>
            </div>
          )}

          {/* Submission History Log */}
          {submissionHistory.length > 0 && (
            <div style={{ marginTop: '2rem', borderTop: '1px solid #2a2f3d', paddingTop: '1rem' }}>
              <h4 style={{ color: '#8b9bb4', margin: '0 0 0.75rem 0' }}>Recent Submissions for this Question ({submissionHistory.length}):</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {submissionHistory.map((sub, idx) => (
                  <div
                    key={sub.id}
                    style={{
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem 1rem',
                      background: '#171a23',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      borderLeft: `4px solid ${sub.verdict === 'passed' ? '#35c377' : '#ef4c5b'}`,
                    }}
                  >
                    <span>Attempt #{submissionHistory.length - idx} @ {sub.time}</span>
                    <span style={{ fontWeight: 'bold', color: sub.verdict === 'passed' ? '#35c377' : '#ef4c5b' }}>
                      {sub.verdict.toUpperCase()} ({sub.testsPassed}/{sub.testsTotal})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
    </div>
  );
}

// Enhanced markdown renderer for problem statements
function renderMarkdownLite(md = '') {
  if (!md) return '';

  let html = md;

  // Code blocks ```...```
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
    return `<pre class="statement-pre"><code>${escapeHtml(code.trim())}</code></pre>`;
  });

  // Headers ### and ##
  html = html.replace(/^###\s+(.*)$/gm, '<h3 class="statement-h3">$1</h3>');
  html = html.replace(/^##\s+(.*)$/gm, '<h2 class="statement-h2">$1</h2>');

  // Bold **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, '<code class="statement-code">$1</code>');

  // Unordered list items starting with - or *
  const lines = html.split('\n');
  let inList = false;
  const processedLines = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        processedLines.push('<ul class="statement-ul">');
        inList = true;
      }
      const content = trimmed.substring(2);
      processedLines.push(`<li class="statement-li">${content}</li>`);
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      processedLines.push(line);
    }
  }
  if (inList) {
    processedLines.push('</ul>');
  }

  html = processedLines.join('\n');

  // Paragraphs (split by double newlines)
  const paragraphs = html.split(/\n\s*\n/);
  html = paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<div') ||
        trimmed.startsWith('<svg') ||
        trimmed.startsWith('<figure') ||
        trimmed.startsWith('<pre')
      ) {
        return trimmed;
      }
      return `<p class="statement-p">${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');

  return html;
}
function escapeHtml(s = '') {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
