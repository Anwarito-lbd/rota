/**
 * Web stand-in for @stripe/stripe-react-native, which is native-only.
 * The web build is a preview: paying happens in the iOS / Android app,
 * where the real SDK and its Payment Sheet are used. Wired in metro.config.js.
 */
import type { ReactNode } from 'react';

export function StripeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const unavailable = async () => ({
  error: { code: 'Failed', message: 'Le paiement se fait dans l’app iOS ou Android.' },
});

export function useStripe() {
  return { initPaymentSheet: unavailable, presentPaymentSheet: unavailable };
}
