/**
 * Virtual try-on with Decart (lucy-vton-3.5 live, lucy-image-2 on a photo).
 *
 * The Decart API key never ships in the app. The `tryon-token` Edge Function
 * (or, for local testing without Supabase, scripts/tryon-token-dev.mjs) mints
 * a short-lived client token restricted to these two models.
 */
import type { Listing } from '../data/listings';
import { supabase } from './supabase';

const DEV_TOKEN_URL = process.env.EXPO_PUBLIC_TRYON_TOKEN_URL ?? '';

export const TRYON_LIVE_MODEL = 'lucy-vton-3.5' as const;
export const TRYON_PHOTO_MODEL = 'lucy-image-2' as const;

export const tryOnConfigured = Boolean(supabase) || DEV_TOKEN_URL.length > 0;

export async function getTryOnToken(): Promise<string> {
  if (supabase) {
    const { data, error } = await supabase.functions.invoke('tryon-token', { body: {} });
    if (error) {
      const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
      throw new Error(body?.error ?? error.message);
    }
    return (data as { apiKey: string }).apiKey;
  }
  if (DEV_TOKEN_URL) {
    const res = await fetch(DEV_TOKEN_URL, { method: 'POST' });
    if (!res.ok) throw new Error(`token ${res.status}`);
    return ((await res.json()) as { apiKey: string }).apiKey;
  }
  throw new Error('tryon_not_configured');
}

/** What the model is asked to put on the person. */
export function garmentPrompt(listing: Listing) {
  const bits = [listing.title, listing.brand ? `by ${listing.brand}` : null, listing.category].filter(Boolean).join(', ');
  return `Substitute the current outfit with this garment: ${bits}. Keep the person, pose, face and background unchanged.`;
}
