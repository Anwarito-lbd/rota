/** Account rules shared by the signup form and the settings screens. */

import { pieces } from '../data/catalog';

/** Handles already in use — a real backend would check this server-side. */
export const TAKEN_USERNAMES = new Set(
  [...pieces.map((p) => p.handle), 'camille.b', 'lea.m', 'dana.p', 'jess.t', 'rota', 'admin'].map(
    (u) => u.toLowerCase(),
  ),
);

export const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/;

export function usernameError(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (!value) return "Choisissez un nom d'utilisateur.";
  if (!USERNAME_PATTERN.test(value)) {
    return '3 à 20 caractères : lettres minuscules, chiffres, point ou tiret bas.';
  }
  if (TAKEN_USERNAMES.has(value)) return 'Ce nom d’utilisateur est déjà pris.';
  return null;
}

export interface PasswordChecks {
  length: boolean;
  upper: boolean;
  digit: boolean;
  symbol: boolean;
}

export function passwordChecks(pw: string): PasswordChecks {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    digit: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
}

export const passwordValid = (pw: string) => Object.values(passwordChecks(pw)).every(Boolean);

/** 0–4, used for the strength meter. */
export const passwordScore = (pw: string) =>
  Object.values(passwordChecks(pw)).filter(Boolean).length;

export const emailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim());

/** Six digits, as sent by e-mail. */
export const makeOtp = () => String(Math.floor(100000 + Math.random() * 900000));
