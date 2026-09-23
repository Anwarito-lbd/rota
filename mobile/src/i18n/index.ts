import { useCallback } from 'react';
import { useStore } from '../state/store';
import type { Lang } from '../state/types';

export const LANGUAGES: { key: Lang; label: string; native: string }[] = [
  { key: 'fr', label: 'Français', native: 'Français' },
  { key: 'en', label: 'English', native: 'English' },
  { key: 'es', label: 'Español', native: 'Español' },
];

/**
 * Screens are translated as they are ported. A missing key falls back to
 * French rather than showing the raw key.
 */
const fr = {
  'tab.feed': 'Feed',
  'tab.discover': 'Explorer',
  'tab.list': 'Louez',
  'tab.messages': 'Messages',
  'tab.closet': 'Dressing',

  'common.back': 'Retour',
  'common.cancel': 'Annuler',
  'common.save': 'Enregistrer',
  'common.continue': 'Continuer',
  'common.retry': 'Réessayer',
  'common.loading': 'Chargement…',
  'common.day': 'jour',
  'common.perDay': '/ jour',
  'common.size': 'Taille',
  'common.add': 'Ajouter',
  'common.delete': 'Supprimer',
  'common.done': 'Terminé',

  'feed.emptyTitle': 'Rien à charger ici',
  'feed.emptyBody':
    'Aucune pièce n’est encore en location. Mettez la première en ligne : elle apparaîtra ici pour tout le monde.',
  'feed.emptyCta': 'Mettre une pièce en location',
  'feed.error': 'Impossible de charger les annonces.',
  'feed.rent': 'Louer',

  'discover.title': 'Explorer',
  'discover.empty': 'Rien à explorer pour l’instant',
  'discover.emptyBody': 'Les pièces mises en location apparaîtront ici, classées par occasion et par taille.',

  'messages.title': 'Messages',
  'messages.empty': 'Aucun message',
  'messages.emptyBody': 'Vos conversations avec les prêteuses et les locataires apparaîtront ici.',

  'closet.myPieces': 'Vos pièces',
  'closet.noPieces': 'Vous n’avez pas encore de pièce en location.',
  'closet.addPiece': '+ Mettre une pièce en location',
  'closet.settings': 'Réglages',
  'closet.signOut': 'Se déconnecter',
  'closet.memberSince': 'Membre',
  'closet.verifications': 'Vérifications',
  'closet.emailVerified': 'E-mail vérifié',
  'closet.identity': 'Identité',
  'closet.certified': 'Compte certifié',

  'settings.title': 'Réglages',
  'settings.language': 'Langue',
  'settings.account': 'Compte',
  'settings.username': 'Nom d’utilisateur',
  'settings.email': 'E-mail',
  'settings.verified': 'Vérifié',
  'settings.toVerify': 'À vérifier',
  'settings.todo': 'À faire',
  'settings.pending': 'En cours',
  'settings.security': 'Sécurité et règles',
  'settings.guidelines': 'Règles de la communauté',
  'settings.fees': 'Frais et annulation',
  'settings.support': 'Aide et contact',
  'settings.legal': 'Informations légales',
  'settings.version': 'Rota 1.0 · Paris',

  'list.title': 'Mettre une pièce en location',
  'list.step1': 'Photos et vidéo',
  'list.step2': 'La pièce',
  'list.step3': 'Prix et règles',
  'list.video': 'Vidéo verticale',
  'list.photoFront': 'Face',
  'list.photoBack': 'Dos / défauts',
  'list.titleField': 'Titre',
  'list.titlePlaceholder': 'Nuisette en biais, ivoire',
  'list.brand': 'Marque',
  'list.brandPlaceholder': 'Réalisation Par',
  'list.retail': 'Valeur neuve',
  'list.category': 'Catégorie',
  'list.sizes': 'Tailles proposées',
  'list.sizesHint': 'Cochez toutes les tailles que vous proposez pour cette pièce.',
  'list.price': 'Votre prix par jour',
  'list.cleaningTitle': 'Je ne veux pas qu’on lave la pièce',
  'list.cleaningBody':
    'Vous vous chargez du nettoyage et facturez des frais. Désactivé, la pièce vous est rendue propre, sans frais.',
  'list.cleaningFee': 'Frais de nettoyage',
  'list.rules': 'Vos règles',
  'list.rulesHint': 'La locataire doit les accepter avant de payer.',
  'list.rulePlaceholder': 'Ex. : pas de cigarette',
  'list.authenticity': 'Preuve d’authenticité',
  'list.authenticityHint':
    'Photo de la facture ou de l’étiquette. Sans preuve, l’annonce n’a pas le badge « Authenticité vérifiée ».',
  'list.publish': 'Mettre en location',
  'list.publishing': 'Publication…',
  'list.published': 'Votre annonce est en ligne.',
  'list.needPhoto': 'Ajoutez au moins une photo.',
  'list.needTitle': 'Donnez un titre à votre pièce.',
  'list.needSize': 'Choisissez au moins une taille.',

  'detail.rules': 'Règles de la prêteuse',
  'detail.sizeOffered': 'Taille proposée',
  'detail.sizesOffered': 'Tailles proposées',
  'detail.viewDates': 'Voir les dates',
  'detail.offer': 'Proposer',
} as const;

export type TranslationKey = keyof typeof fr;

const en: Partial<Record<TranslationKey, string>> = {
  'tab.feed': 'Feed',
  'tab.discover': 'Explore',
  'tab.list': 'Lend',
  'tab.messages': 'Messages',
  'tab.closet': 'Closet',

  'common.back': 'Back',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.continue': 'Continue',
  'common.retry': 'Try again',
  'common.loading': 'Loading…',
  'common.day': 'day',
  'common.perDay': '/ day',
  'common.size': 'Size',
  'common.add': 'Add',
  'common.delete': 'Delete',
  'common.done': 'Done',

  'feed.emptyTitle': 'Nothing here yet',
  'feed.emptyBody':
    'No piece is up for rent yet. List the first one — it will show up here for everyone.',
  'feed.emptyCta': 'List a piece',
  'feed.error': 'Could not load the listings.',
  'feed.rent': 'Rent',

  'discover.title': 'Explore',
  'discover.empty': 'Nothing to explore yet',
  'discover.emptyBody': 'Pieces put up for rent will appear here, sorted by occasion and size.',

  'messages.title': 'Messages',
  'messages.empty': 'No messages',
  'messages.emptyBody': 'Your conversations with lenders and renters will appear here.',

  'closet.myPieces': 'Your pieces',
  'closet.noPieces': 'You have no piece up for rent yet.',
  'closet.addPiece': '+ List a piece',
  'closet.settings': 'Settings',
  'closet.signOut': 'Sign out',
  'closet.memberSince': 'Member',
  'closet.verifications': 'Verifications',
  'closet.emailVerified': 'E-mail verified',
  'closet.identity': 'Identity',
  'closet.certified': 'Certified account',

  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.account': 'Account',
  'settings.username': 'Username',
  'settings.email': 'E-mail',
  'settings.verified': 'Verified',
  'settings.toVerify': 'To verify',
  'settings.todo': 'To do',
  'settings.pending': 'Pending',
  'settings.security': 'Safety and rules',
  'settings.guidelines': 'Community guidelines',
  'settings.fees': 'Fees and cancellation',
  'settings.support': 'Help and contact',
  'settings.legal': 'Legal information',
  'settings.version': 'Rota 1.0 · Paris',

  'list.title': 'List a piece',
  'list.step1': 'Photos and video',
  'list.step2': 'The piece',
  'list.step3': 'Price and rules',
  'list.video': 'Vertical video',
  'list.photoFront': 'Front',
  'list.photoBack': 'Back / flaws',
  'list.titleField': 'Title',
  'list.titlePlaceholder': 'Ivory bias-cut slip dress',
  'list.brand': 'Brand',
  'list.brandPlaceholder': 'Réalisation Par',
  'list.retail': 'Retail value',
  'list.category': 'Category',
  'list.sizes': 'Sizes offered',
  'list.sizesHint': 'Tick every size you offer for this piece.',
  'list.price': 'Your price per day',
  'list.cleaningTitle': 'I do not want it washed',
  'list.cleaningBody':
    'You handle the cleaning and charge a fee. Off, the piece comes back clean at no cost.',
  'list.cleaningFee': 'Cleaning fee',
  'list.rules': 'Your rules',
  'list.rulesHint': 'The renter must accept them before paying.',
  'list.rulePlaceholder': 'e.g. no smoking',
  'list.authenticity': 'Proof of authenticity',
  'list.authenticityHint':
    'Photo of the receipt or the label. Without proof, the listing gets no "Authenticity verified" badge.',
  'list.publish': 'Publish listing',
  'list.publishing': 'Publishing…',
  'list.published': 'Your listing is live.',
  'list.needPhoto': 'Add at least one photo.',
  'list.needTitle': 'Give your piece a title.',
  'list.needSize': 'Choose at least one size.',

  'detail.rules': "Lender's rules",
  'detail.sizeOffered': 'Size offered',
  'detail.sizesOffered': 'Sizes offered',
  'detail.viewDates': 'See the dates',
  'detail.offer': 'Make an offer',
};

const es: Partial<Record<TranslationKey, string>> = {
  'tab.feed': 'Feed',
  'tab.discover': 'Explorar',
  'tab.list': 'Alquilar',
  'tab.messages': 'Mensajes',
  'tab.closet': 'Armario',

  'common.back': 'Atrás',
  'common.cancel': 'Cancelar',
  'common.save': 'Guardar',
  'common.continue': 'Continuar',
  'common.retry': 'Reintentar',
  'common.loading': 'Cargando…',
  'common.day': 'día',
  'common.perDay': '/ día',
  'common.size': 'Talla',
  'common.add': 'Añadir',
  'common.delete': 'Eliminar',
  'common.done': 'Hecho',

  'feed.emptyTitle': 'Aquí no hay nada todavía',
  'feed.emptyBody':
    'Aún no hay ninguna prenda en alquiler. Publica la primera: aparecerá aquí para todos.',
  'feed.emptyCta': 'Publicar una prenda',
  'feed.error': 'No se pudieron cargar los anuncios.',
  'feed.rent': 'Alquilar',

  'discover.title': 'Explorar',
  'discover.empty': 'Nada que explorar por ahora',
  'discover.emptyBody': 'Las prendas en alquiler aparecerán aquí, por ocasión y por talla.',

  'messages.title': 'Mensajes',
  'messages.empty': 'Sin mensajes',
  'messages.emptyBody': 'Tus conversaciones con prestadoras y arrendatarias aparecerán aquí.',

  'closet.myPieces': 'Tus prendas',
  'closet.noPieces': 'Todavía no tienes ninguna prenda en alquiler.',
  'closet.addPiece': '+ Publicar una prenda',
  'closet.settings': 'Ajustes',
  'closet.signOut': 'Cerrar sesión',
  'closet.memberSince': 'Miembro',
  'closet.verifications': 'Verificaciones',
  'closet.emailVerified': 'Correo verificado',
  'closet.identity': 'Identidad',
  'closet.certified': 'Cuenta certificada',

  'settings.title': 'Ajustes',
  'settings.language': 'Idioma',
  'settings.account': 'Cuenta',
  'settings.username': 'Nombre de usuario',
  'settings.email': 'Correo',
  'settings.verified': 'Verificado',
  'settings.toVerify': 'Por verificar',
  'settings.todo': 'Pendiente',
  'settings.pending': 'En curso',
  'settings.security': 'Seguridad y normas',
  'settings.guidelines': 'Normas de la comunidad',
  'settings.fees': 'Tarifas y cancelación',
  'settings.support': 'Ayuda y contacto',
  'settings.legal': 'Información legal',
  'settings.version': 'Rota 1.0 · París',

  'list.title': 'Publicar una prenda',
  'list.step1': 'Fotos y vídeo',
  'list.step2': 'La prenda',
  'list.step3': 'Precio y normas',
  'list.video': 'Vídeo vertical',
  'list.photoFront': 'Delante',
  'list.photoBack': 'Detrás / defectos',
  'list.titleField': 'Título',
  'list.titlePlaceholder': 'Vestido lencero al bies, marfil',
  'list.brand': 'Marca',
  'list.brandPlaceholder': 'Réalisation Par',
  'list.retail': 'Valor de nuevo',
  'list.category': 'Categoría',
  'list.sizes': 'Tallas ofrecidas',
  'list.sizesHint': 'Marca todas las tallas que ofreces para esta prenda.',
  'list.price': 'Tu precio por día',
  'list.cleaningTitle': 'No quiero que la laven',
  'list.cleaningBody':
    'Tú te encargas de la limpieza y cobras una tarifa. Desactivado, la prenda se devuelve limpia, sin coste.',
  'list.cleaningFee': 'Tarifa de limpieza',
  'list.rules': 'Tus normas',
  'list.rulesHint': 'La arrendataria debe aceptarlas antes de pagar.',
  'list.rulePlaceholder': 'Ej.: nada de tabaco',
  'list.authenticity': 'Prueba de autenticidad',
  'list.authenticityHint':
    'Foto del recibo o de la etiqueta. Sin prueba, el anuncio no lleva el sello «Autenticidad verificada».',
  'list.publish': 'Publicar',
  'list.publishing': 'Publicando…',
  'list.published': 'Tu anuncio está publicado.',
  'list.needPhoto': 'Añade al menos una foto.',
  'list.needTitle': 'Ponle un título a tu prenda.',
  'list.needSize': 'Elige al menos una talla.',

  'detail.rules': 'Normas de la prestadora',
  'detail.sizeOffered': 'Talla ofrecida',
  'detail.sizesOffered': 'Tallas ofrecidas',
  'detail.viewDates': 'Ver las fechas',
  'detail.offer': 'Hacer una oferta',
};

const DICTIONARIES: Record<Lang, Partial<Record<TranslationKey, string>>> = { fr, en, es };

export function useT() {
  const { state, set } = useStore();
  const lang = state.lang;

  const t = useCallback(
    (key: TranslationKey) => DICTIONARIES[lang]?.[key] ?? fr[key],
    [lang],
  );

  const setLang = useCallback((next: Lang) => set({ lang: next }), [set]);

  return { t, lang, setLang };
}
