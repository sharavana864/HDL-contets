import crypto from 'crypto';
import { query } from '../config/db.js';

export function hashCode(code) {
  return crypto.createHash('sha256').update(normalize(code)).digest('hex');
}

// Strip whitespace/comments so trivial reformatting doesn't evade the hash
// match, then compare against other submissions for the same problem using
// a token-level Jaccard similarity as a cheap, dependency-free heuristic.
// Swap in an AST-diff tool (e.g. via a Verilog parser) for stronger detection.
function normalize(code) {
  return code
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function tokenize(code) {
  return new Set(normalize(code).split(/[^a-z0-9_]+/).filter(Boolean));
}

function jaccard(a, b) {
  const setA = tokenize(a);
  const setB = tokenize(b);
  const intersection = [...setA].filter((t) => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// Compares a new submission's code against every other submission for the
// same problem (excluding the same user) and stores flags above the
// similarity threshold for judge review.
export async function checkPlagiarism({ submissionId, problemId, userId, code }) {
  const THRESHOLD = 0.85;
  const others = await query(
    `SELECT id, code FROM submissions
     WHERE problem_id = $1 AND user_id != $2 AND verdict = 'passed'`,
    [problemId, userId]
  );

  const flags = [];
  for (const row of others.rows) {
    const similarity = jaccard(code, row.code);
    if (similarity >= THRESHOLD) {
      await query(
        `INSERT INTO plagiarism_flags (submission_a, submission_b, similarity, method)
         VALUES ($1, $2, $3, 'token-jaccard')`,
        [submissionId, row.id, (similarity * 100).toFixed(2)]
      );
      flags.push({ against: row.id, similarity });
    }
  }
  return flags;
}
