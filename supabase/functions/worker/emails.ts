// Reminder and receipt emails, in the member's language. Plain text on
// purpose: it reads well everywhere and nothing in it can be spoofed as a
// login link.

export type Lang = 'fr' | 'en' | 'es';

export interface EmailContext {
  kind: string;
  lang: Lang;
  username: string;
  title: string | null;
  start: string | null;
  end: string | null;
  payload: Record<string, unknown>;
}

const money = (v: unknown, lang: Lang) =>
  new Intl.NumberFormat(lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(v ?? 0));

const when = (v: unknown, lang: Lang) =>
  v
    ? new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'fr-FR', {
        dateStyle: 'full',
        timeStyle: typeof v === 'string' && v.includes('T') ? 'short' : undefined,
        timeZone: 'Europe/Paris',
      }).format(new Date(String(v)))
    : '';

type Template = (c: EmailContext, piece: string) => [subject: string, body: string];

const T: Record<string, Record<Lang, Template>> = {
  booking_confirmed: {
    fr: (c, p) => [`Nouvelle réservation : ${p}`, `${p} est réservée du ${when(c.start, c.lang)} au ${when(c.end, c.lang)}. Le paiement est confirmé. Prenez les photos d’état dans l’app avant la remise.`],
    en: (c, p) => [`New booking: ${p}`, `${p} is booked from ${when(c.start, c.lang)} to ${when(c.end, c.lang)}. Payment is confirmed. Take the condition photos in the app before the handover.`],
    es: (c, p) => [`Nueva reserva: ${p}`, `${p} está reservada del ${when(c.start, c.lang)} al ${when(c.end, c.lang)}. El pago está confirmado. Haz las fotos del estado en la app antes de la entrega.`],
  },
  payment_received: {
    fr: (c, p) => [`Paiement reçu — ${p}`, `Nous avons bien reçu ${money(c.payload.amount, c.lang)} pour ${p}. Votre carte est conservée uniquement pour les frais acceptés au paiement (retard, dommages validés par Rota).`],
    en: (c, p) => [`Payment received — ${p}`, `We received ${money(c.payload.amount, c.lang)} for ${p}. Your card is kept only for the charges you accepted at checkout (late return, damage approved by Rota).`],
    es: (c, p) => [`Pago recibido — ${p}`, `Hemos recibido ${money(c.payload.amount, c.lang)} por ${p}. Tu tarjeta se guarda solo para los cargos que aceptaste al pagar (retraso, daños validados por Rota).`],
  },
  payment_expired: {
    fr: (_c, p) => [`Réservation annulée — ${p}`, `Le paiement n’a pas été finalisé à temps, les dates de ${p} sont libérées. Rien ne vous a été prélevé.`],
    en: (_c, p) => [`Booking cancelled — ${p}`, `Payment wasn’t completed in time, so the dates for ${p} were released. You haven’t been charged.`],
    es: (_c, p) => [`Reserva cancelada — ${p}`, `El pago no se completó a tiempo y las fechas de ${p} se han liberado. No se te ha cobrado nada.`],
  },
  return_due_soon: {
    fr: (c, p) => [`À rendre demain — ${p}`, `Petit rappel : ${p} est à rendre avant le ${when(c.payload.due, c.lang)}. Le propriétaire vous montrera un code à saisir dans l’app au retour.`],
    en: (c, p) => [`Due back tomorrow — ${p}`, `A reminder: ${p} is due back by ${when(c.payload.due, c.lang)}. The owner will show you a code to enter in the app at the return.`],
    es: (c, p) => [`Devolución mañana — ${p}`, `Recordatorio: ${p} debe devolverse antes del ${when(c.payload.due, c.lang)}. El propietario te mostrará un código para introducir en la app.`],
  },
  return_overdue: {
    fr: (c, p) => [`Retour en retard — ${p}`, `${p} devait être rendue. Vous avez ${c.payload.grace_hours} h de tolérance avant que des frais de retard s’appliquent (${money(c.payload.per_day, c.lang)} par jour, plafonnés).`],
    en: (c, p) => [`Return overdue — ${p}`, `${p} was due back. You have ${c.payload.grace_hours} hours of grace before late fees apply (${money(c.payload.per_day, c.lang)} per day, capped).`],
    es: (c, p) => [`Devolución con retraso — ${p}`, `${p} debía devolverse. Tienes ${c.payload.grace_hours} h de margen antes de que se apliquen cargos por retraso (${money(c.payload.per_day, c.lang)} al día, con tope).`],
  },
  late_fees_started: {
    fr: (c, p) => [`Frais de retard — ${p}`, `Des frais de retard s’appliquent désormais : ${money(c.payload.per_day, c.lang)} par jour, jamais plus de ${money(c.payload.cap, c.lang)} au total. Ils seront prélevés au retour de la pièce.`],
    en: (c, p) => [`Late fees — ${p}`, `Late fees now apply: ${money(c.payload.per_day, c.lang)} per day, never more than ${money(c.payload.cap, c.lang)} in total. They’re charged when the piece is returned.`],
    es: (c, p) => [`Cargos por retraso — ${p}`, `Ahora se aplican cargos por retraso: ${money(c.payload.per_day, c.lang)} al día, nunca más de ${money(c.payload.cap, c.lang)} en total. Se cobrarán al devolver la prenda.`],
  },
  non_return_review: {
    fr: (_c, p) => [`Non-restitution — ${p}`, `${p} n’a toujours pas été rendue. Une personne de Rota examine la situation et va contacter les deux parties.`],
    en: (_c, p) => [`Not returned — ${p}`, `${p} still hasn’t been returned. Someone at Rota is reviewing the situation and will contact both of you.`],
    es: (_c, p) => [`Sin devolver — ${p}`, `${p} todavía no se ha devuelto. Una persona de Rota está revisando la situación y contactará con ambas partes.`],
  },
  claim_window_open: {
    fr: (c, p) => [`Pièce rendue — ${p}`, `Le retour de ${p} est confirmé. Si vous constatez un dommage, ouvrez une réclamation dans l’app avant le ${when(c.payload.until, c.lang)}. Sinon, votre paiement sera envoyé ensuite.`],
    en: (c, p) => [`Piece returned — ${p}`, `The return of ${p} is confirmed. If you find damage, open a claim in the app before ${when(c.payload.until, c.lang)}. Otherwise your payout is sent afterwards.`],
    es: (c, p) => [`Prenda devuelta — ${p}`, `La devolución de ${p} está confirmada. Si ves algún daño, abre una reclamación en la app antes del ${when(c.payload.until, c.lang)}. Si no, tu pago se enviará después.`],
  },
  claim_opened: {
    fr: (_c, p) => [`Réclamation ouverte — ${p}`, `Le propriétaire de ${p} a ouvert une réclamation. Donnez votre version dans l’app : Rota décide, jamais le propriétaire, et jamais au-delà du montant maximum affiché au paiement.`],
    en: (_c, p) => [`Claim opened — ${p}`, `The owner of ${p} opened a claim. Give your side in the app: Rota decides, never the owner, and never beyond the maximum shown at checkout.`],
    es: (_c, p) => [`Reclamación abierta — ${p}`, `El propietario de ${p} ha abierto una reclamación. Da tu versión en la app: decide Rota, nunca el propietario, y nunca por encima del máximo mostrado al pagar.`],
  },
  claim_decided: {
    fr: (c, p) => [`Réclamation tranchée — ${p}`, Number(c.payload.approved ?? 0) > 0 ? `Rota a validé ${money(c.payload.approved, c.lang)} pour la réclamation sur ${p}.` : `Rota a rejeté la réclamation sur ${p}. Rien ne sera prélevé.`],
    en: (c, p) => [`Claim decided — ${p}`, Number(c.payload.approved ?? 0) > 0 ? `Rota approved ${money(c.payload.approved, c.lang)} for the claim on ${p}.` : `Rota rejected the claim on ${p}. Nothing will be charged.`],
    es: (c, p) => [`Reclamación resuelta — ${p}`, Number(c.payload.approved ?? 0) > 0 ? `Rota ha validado ${money(c.payload.approved, c.lang)} para la reclamación sobre ${p}.` : `Rota ha rechazado la reclamación sobre ${p}. No se cobrará nada.`],
  },
  claim_paid: {
    fr: (c, p) => [`Indemnisation encaissée — ${p}`, `${money(c.payload.amount, c.lang)} ont été encaissés pour votre réclamation. Ils seront ajoutés à votre prochain paiement.`],
    en: (c, p) => [`Compensation collected — ${p}`, `${money(c.payload.amount, c.lang)} was collected for your claim. It’s added to your next payout.`],
    es: (c, p) => [`Indemnización cobrada — ${p}`, `Se han cobrado ${money(c.payload.amount, c.lang)} por tu reclamación. Se sumarán a tu próximo pago.`],
  },
  payout_sent: {
    fr: (c, p) => [`Paiement envoyé — ${p}`, `${money(c.payload.amount, c.lang)} ont été envoyés sur votre compte de gains Stripe pour ${p}. Le virement vers votre banque suit le calendrier de Stripe.`],
    en: (c, p) => [`Payout sent — ${p}`, `${money(c.payload.amount, c.lang)} was sent to your Stripe earnings account for ${p}. The transfer to your bank follows Stripe’s schedule.`],
    es: (c, p) => [`Pago enviado — ${p}`, `Se han enviado ${money(c.payload.amount, c.lang)} a tu cuenta de ganancias de Stripe por ${p}. La transferencia a tu banco sigue el calendario de Stripe.`],
  },
  payout_setup_required: {
    fr: (_c, p) => [`Vos gains vous attendent — ${p}`, `Pour recevoir l’argent de ${p}, ouvrez Rota › Dressing › « Recevoir mes gains » et ajoutez vos coordonnées bancaires. Le paiement part dès que c’est fait.`],
    en: (_c, p) => [`Your earnings are waiting — ${p}`, `To receive the money for ${p}, open Rota › Closet › “Get paid” and add your bank details. The payout goes out as soon as that’s done.`],
    es: (_c, p) => [`Tus ganancias te esperan — ${p}`, `Para recibir el dinero de ${p}, abre Rota › Armario › «Cobrar mis ganancias» y añade tus datos bancarios. El pago sale en cuanto lo hagas.`],
  },
  charge_failed: {
    fr: (_c, p) => [`Paiement refusé — ${p}`, `Nous n’avons pas pu prélever un montant dû pour ${p}. Ouvrez l’app pour mettre à jour votre moyen de paiement ; une personne de Rota va vous contacter.`],
    en: (_c, p) => [`Payment declined — ${p}`, `We couldn’t collect an amount due for ${p}. Open the app to update your payment method; someone at Rota will contact you.`],
    es: (_c, p) => [`Pago rechazado — ${p}`, `No hemos podido cobrar un importe pendiente de ${p}. Abre la app para actualizar tu método de pago; una persona de Rota te contactará.`],
  },
  refunded: {
    fr: (c, p) => [`Remboursement — ${p}`, `${money(c.payload.amount, c.lang)} vous ont été remboursés pour ${p}. Selon votre banque, comptez 5 à 10 jours.`],
    en: (c, p) => [`Refund — ${p}`, `${money(c.payload.amount, c.lang)} was refunded for ${p}. Depending on your bank, allow 5 to 10 days.`],
    es: (c, p) => [`Reembolso — ${p}`, `Te hemos reembolsado ${money(c.payload.amount, c.lang)} por ${p}. Según tu banco, puede tardar de 5 a 10 días.`],
  },
};

const GREETING: Record<Lang, (u: string) => string> = {
  fr: (u) => `Bonjour @${u},`,
  en: (u) => `Hi @${u},`,
  es: (u) => `Hola @${u}:`,
};
const SIGN: Record<Lang, string> = {
  fr: '— L’équipe Rota\nVous recevez cet email parce que vous avez une location en cours sur Rota.',
  en: '— The Rota team\nYou’re receiving this because you have a rental in progress on Rota.',
  es: '— El equipo de Rota\nRecibes este correo porque tienes un alquiler en curso en Rota.',
};
const PIECE: Record<Lang, string> = { fr: 'votre pièce', en: 'your piece', es: 'tu prenda' };

/** Null for kinds that have no email (they stay in-app only). */
export function render(c: EmailContext): { subject: string; text: string } | null {
  const lang: Lang = c.lang === 'en' || c.lang === 'es' ? c.lang : 'fr';
  const template = T[c.kind]?.[lang];
  if (!template) return null;
  const quoted = lang === 'en' ? `“${c.title}”` : lang === 'es' ? `«${c.title}»` : `« ${c.title} »`;
  const [subject, body] = template({ ...c, lang }, c.title ? quoted : PIECE[lang]);
  return { subject, text: `${GREETING[lang](c.username)}\n\n${body}\n\n${SIGN[lang]}` };
}

export const KINDS = Object.keys(T);
