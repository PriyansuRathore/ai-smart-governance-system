const crypto = require('crypto');

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const JWT_ALG = 'HS256';

function base64UrlEncode(input) {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  const [salt, storedHash] = storedPassword.split(':');
  if (!salt || !storedHash) return false;

  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return process.env.JWT_SECRET;
}

function createToken(user) {
  const header = base64UrlEncode(JSON.stringify({ alg: JWT_ALG, typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({
    id:         user.id,
    email:      user.email,
    role:       user.role,
    department: user.department || null,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (Number(process.env.JWT_EXPIRES_IN_SECONDS) || 60 * 60 * 24),
  }));

  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

function verifyToken(token) {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) {
    throw new Error('Invalid token format');
  }

  const expectedSignature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(`${header}.${payload}`)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error('Invalid token signature');
  }

  const decodedHeader = JSON.parse(base64UrlDecode(header));
  if (decodedHeader.alg !== JWT_ALG || decodedHeader.typ !== 'JWT') {
    throw new Error('Invalid token header');
  }

  const decodedPayload = JSON.parse(base64UrlDecode(payload));
  if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return decodedPayload;
}

module.exports = { hashPassword, verifyPassword, createToken, verifyToken };
