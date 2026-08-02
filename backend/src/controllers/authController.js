import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { signToken } from '../config/jwt.js';
import { z } from 'zod';

const registerSchema = z.object({
  participantId: z.string().min(2).max(50),
  name: z.string().min(1).max(150),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  email: z.string().email().optional(),
});

export async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }
  const { participantId, name, password, email } = parsed.data;

  const existing = await query('SELECT id FROM users WHERE participant_id = $1', [participantId]);
  if (existing.rowCount > 0) {
    return res.status(409).json({ error: 'Participant ID already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    `INSERT INTO users (participant_id, name, password_hash, email, role)
     VALUES ($1, $2, $3, $4, 'participant')
     RETURNING id, participant_id, name, role`,
    [participantId, name, passwordHash, email || null]
  );

  const user = result.rows[0];
  const token = signToken({
    id: user.id,
    participantId: user.participant_id,
    name: user.name,
    role: user.role,
  });

  res.status(201).json({ token, user });
}

const loginSchema = z.object({
  participantId: z.string().min(1),
  password: z.string().min(1),
});

export async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'participantId and password are required' });
  }
  const { participantId, password } = parsed.data;

  const result = await query(
    'SELECT id, participant_id, name, password_hash, role, is_active FROM users WHERE participant_id = $1',
    [participantId]
  );
  if (result.rowCount === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const user = result.rows[0];
  if (!user.is_active) {
    return res.status(403).json({ error: 'Account disabled' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken({
    id: user.id,
    participantId: user.participant_id,
    name: user.name,
    role: user.role,
  });

  res.json({
    token,
    user: { id: user.id, participantId: user.participant_id, name: user.name, role: user.role },
  });
}

export async function me(req, res) {
  const result = await query(
    'SELECT id, participant_id, name, role, locale, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
  res.json(result.rows[0]);
}
