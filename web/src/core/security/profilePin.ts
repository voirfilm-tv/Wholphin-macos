const STORAGE_KEY = 'wholphin-web-profile-pins-v1';
const ITERATIONS = 160_000;

interface PinRecord {
  salt: string;
  hash: string;
  iterations: number;
  failedAttempts: number;
  blockedUntil: number;
  updatedAt: string;
}

type PinRecords = Record<string, PinRecord>;

export interface PinVerification {
  ok: boolean;
  remainingMs: number;
  failedAttempts: number;
}

function read(): PinRecords {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as PinRecords; } catch { return {}; }
}

function write(records: PinRecords): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function encode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decode(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function validate(pin: string): void {
  if (!/^\d{4,8}$/.test(pin)) throw new Error('Le PIN doit contenir entre 4 et 8 chiffres.');
}

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, 256);
  return new Uint8Array(bits);
}

function equal(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index]! ^ right[index]!;
  return difference === 0;
}

function cooldown(attempts: number): number {
  if (attempts < 3) return 0;
  return Math.min(5 * 60_000, 5_000 * 3 ** Math.min(4, attempts - 3));
}

export function hasProfilePin(profileKey: string): boolean {
  return Boolean(read()[profileKey]);
}

export async function setProfilePin(profileKey: string, pin: string): Promise<void> {
  validate(pin);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt, ITERATIONS);
  const records = read();
  records[profileKey] = {
    salt: encode(salt),
    hash: encode(hash),
    iterations: ITERATIONS,
    failedAttempts: 0,
    blockedUntil: 0,
    updatedAt: new Date().toISOString(),
  };
  write(records);
}

export function clearProfilePin(profileKey: string): void {
  const records = read();
  delete records[profileKey];
  write(records);
}

export function profilePinRemainingMs(profileKey: string): number {
  const record = read()[profileKey];
  return record ? Math.max(0, record.blockedUntil - Date.now()) : 0;
}

export async function verifyProfilePin(profileKey: string, pin: string): Promise<PinVerification> {
  const records = read();
  const record = records[profileKey];
  if (!record) return { ok: true, remainingMs: 0, failedAttempts: 0 };
  const remaining = Math.max(0, record.blockedUntil - Date.now());
  if (remaining > 0) return { ok: false, remainingMs: remaining, failedAttempts: record.failedAttempts };
  let valid = false;
  try {
    const calculated = await derive(pin, decode(record.salt), record.iterations);
    valid = equal(calculated, decode(record.hash));
  } catch { valid = false; }
  if (valid) {
    record.failedAttempts = 0;
    record.blockedUntil = 0;
    write(records);
    return { ok: true, remainingMs: 0, failedAttempts: 0 };
  }
  record.failedAttempts += 1;
  record.blockedUntil = Date.now() + cooldown(record.failedAttempts);
  write(records);
  return { ok: false, remainingMs: Math.max(0, record.blockedUntil - Date.now()), failedAttempts: record.failedAttempts };
}
