import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-12345';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export const signToken = (payload) =>
  jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });

export const verifyToken = (token) => jwt.verify(token, SECRET);
