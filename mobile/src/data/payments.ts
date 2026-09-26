/**
 * The app's side of Stripe. It never sees a card number or an amount it
 * could change: the `payments` Edge Function creates everything server-side
 * and hands back short-lived client secrets for the Stripe SDK's own sheets.
 */
import { useStripe } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
export const paymentsConfigured = stripePublishableKey.startsWith('pk_');

function client() {
  if (!supabase) throw new Error('server_not_configured');
  return supabase;
}

async function call<T>(action: string, extra: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await client().functions.invoke('payments', { body: { action, ...extra } });
  if (error) {
    // Surface the function's own error code ("expired", "payments_not_configured"…).
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(body?.error ?? error.message);
  }
  return data as T;
}

export interface CheckoutSheet {
  alreadyPaid?: boolean;
  paymentIntentClientSecret?: string;
  customerSessionClientSecret?: string;
  customerId?: string;
}

export const rentalCheckout = (rentalId: string) => call<CheckoutSheet>('rental_checkout', { rentalId });

/** Where 3-D Secure and bank redirects come back to, in Expo Go and in the store app. */
export const stripeUrlScheme =
  Constants.appOwnership === 'expo' ? Linking.createURL('/--/') : Linking.createURL('');

/**
 * Pays one rental with Stripe's own payment sheet (cards, and Apple Pay /
 * Google Pay in the store build). Resolves 'paid' or 'canceled'.
 */
export function usePayRental() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  return useCallback(
    async (rentalId: string, email?: string | null): Promise<'paid' | 'canceled'> => {
      if (!paymentsConfigured) throw new Error('payments_not_configured');
      const sheet = await rentalCheckout(rentalId);
      if (sheet.alreadyPaid) return 'paid';
      if (!sheet.paymentIntentClientSecret || !sheet.customerSessionClientSecret || !sheet.customerId) {
        throw new Error('payments_not_configured');
      }
      const init = await initPaymentSheet({
        merchantDisplayName: 'Rota',
        customerId: sheet.customerId,
        customerSessionClientSecret: sheet.customerSessionClientSecret,
        paymentIntentClientSecret: sheet.paymentIntentClientSecret,
        returnURL: Linking.createURL('stripe-redirect'),
        // Only methods that confirm at once: the dates are held for 30 minutes.
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: email ? { email } : undefined,
      });
      if (init.error) throw new Error(init.error.message);
      const result = await presentPaymentSheet();
      if (result.error) {
        if (result.error.code === 'Canceled') return 'canceled';
        throw new Error(result.error.message);
      }
      return 'paid';
    },
    [initPaymentSheet, presentPaymentSheet],
  );
}

export interface PayoutStatus {
  hasAccount: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

/** Opens Stripe's hosted onboarding, then reports where the member stands. */
export async function setUpPayouts(): Promise<PayoutStatus> {
  const { url } = await call<{ url: string }>('connect_onboarding');
  await WebBrowser.openBrowserAsync(url);
  return call<PayoutStatus>('connect_status');
}

export async function openPayoutDashboard() {
  const { url } = await call<{ url: string }>('connect_dashboard');
  await WebBrowser.openBrowserAsync(url);
}

/** Stripe Identity (ID + selfie), hosted by Stripe. Returns the session status after. */
export async function verifyIdentity(): Promise<string> {
  const { url } = await call<{ url: string }>('identity_session');
  await WebBrowser.openBrowserAsync(url);
  return (await call<{ status: string }>('identity_status')).status;
}

export function usePayoutStatus(enabled: boolean) {
  const [status, setStatus] = useState<PayoutStatus | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled || !supabase) return;
    let cancelled = false;
    // The row is readable by its owner (RLS); Stripe itself is only asked on demand.
    supabase
      .from('payment_accounts')
      .select('stripe_account_id, payouts_enabled, details_submitted')
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setStatus({
          hasAccount: !!data?.stripe_account_id,
          payoutsEnabled: !!data?.payouts_enabled,
          detailsSubmitted: !!data?.details_submitted,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, tick]);
  return { status, setStatus, refresh: useCallback(() => setTick((n) => n + 1), []) };
}

// ── Saved cards (Settings › Paiements) ─────────────────────────

export interface SavedMethod {
  id: string;
  type: string;
  brand: string;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
}

export const listPaymentMethods = async () => (await call<{ methods: SavedMethod[] }>('payment_methods')).methods;

export const removePaymentMethod = (id: string) => call<{ removed: boolean }>('remove_payment_method', { id });

/** Adds a card without booking anything, in Stripe's own sheet. Resolves 'added' or 'canceled'. */
export function useAddCard() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  return useCallback(async (): Promise<'added' | 'canceled'> => {
    if (!paymentsConfigured) throw new Error('payments_not_configured');
    const sheet = await call<{
      setupIntentClientSecret: string;
      customerSessionClientSecret: string;
      customerId: string;
    }>('setup_sheet');
    const init = await initPaymentSheet({
      merchantDisplayName: 'Rota',
      customerId: sheet.customerId,
      customerSessionClientSecret: sheet.customerSessionClientSecret,
      setupIntentClientSecret: sheet.setupIntentClientSecret,
      returnURL: Linking.createURL('stripe-redirect'),
    });
    if (init.error) throw new Error(init.error.message);
    const result = await presentPaymentSheet();
    if (result.error) {
      if (result.error.code === 'Canceled') return 'canceled';
      throw new Error(result.error.message);
    }
    return 'added';
  }, [initPaymentSheet, presentPaymentSheet]);
}
