/**
 * What a listing can be: a category tree in the spirit of Vinted's, limited
 * to what can be rented and worn, and a list of brands with the luxury ones
 * marked (those need proof of authenticity).
 *
 * The listing stores the leaf id (category_id) and the leaf's French label
 * (category) so older screens keep showing something readable.
 */
import type { Lang } from '../state/types';

type Label = Record<Lang, string>;
const L = (fr: string, en: string, es: string): Label => ({ fr, en, es });

/** Which size scale a leaf uses. */
export type SizeKind = 'letters' | 'shoes' | 'kids' | 'baby' | 'one';

export interface CategoryNode {
  id: string;
  label: Label;
  icon?: string;
  sizeKind?: SizeKind;
  children?: CategoryNode[];
}

const leaf = (id: string, label: Label, sizeKind: SizeKind): CategoryNode => ({ id, label, sizeKind });
const group = (id: string, label: Label, sizeKind: SizeKind, leaves: [string, Label][]): CategoryNode => ({
  id,
  label,
  children: leaves.map(([key, l]) => leaf(`${id}.${key}`, l, sizeKind)),
});

export const CATEGORY_TREE: CategoryNode[] = [
  {
    id: 'women',
    label: L('Femmes', 'Women', 'Mujer'),
    icon: '👗',
    children: [
      group('women.clothing', L('Vêtements', 'Clothing', 'Ropa'), 'letters', [
        ['evening', L('Robes de soirée', 'Evening dresses', 'Vestidos de noche')],
        ['dresses', L('Robes', 'Dresses', 'Vestidos')],
        ['bridal', L('Robes de mariée', 'Wedding dresses', 'Vestidos de novia')],
        ['guest', L('Tenues d’invitée', 'Wedding guest outfits', 'Looks de invitada')],
        ['jumpsuits', L('Combinaisons', 'Jumpsuits', 'Monos')],
        ['skirts', L('Jupes', 'Skirts', 'Faldas')],
        ['tops', L('Tops et chemisiers', 'Tops and blouses', 'Tops y blusas')],
        ['knit', L('Pulls et gilets', 'Knitwear', 'Jerséis y chaquetas de punto')],
        ['coats', L('Manteaux et vestes', 'Coats and jackets', 'Abrigos y chaquetas')],
        ['suits', L('Blazers et tailleurs', 'Blazers and suits', 'Blazers y trajes')],
        ['trousers', L('Pantalons', 'Trousers', 'Pantalones')],
        ['jeans', L('Jeans', 'Jeans', 'Vaqueros')],
        ['shorts', L('Shorts', 'Shorts', 'Pantalones cortos')],
        ['lingerie', L('Lingerie et nuisettes', 'Lingerie and nightwear', 'Lencería y camisones')],
        ['swim', L('Maillots de bain', 'Swimwear', 'Bañadores')],
        ['sport', L('Tenues de sport', 'Sportswear', 'Ropa deportiva')],
        ['costumes', L('Costumes et déguisements', 'Costumes', 'Disfraces')],
        ['maternity', L('Vêtements de grossesse', 'Maternity', 'Premamá')],
        ['other', L('Autres', 'Other', 'Otros')],
      ]),
      group('women.shoes', L('Chaussures', 'Shoes', 'Zapatos'), 'shoes', [
        ['heels', L('Talons', 'Heels', 'Tacones')],
        ['sandals', L('Sandales', 'Sandals', 'Sandalias')],
        ['boots', L('Bottes et bottines', 'Boots', 'Botas y botines')],
        ['sneakers', L('Baskets', 'Trainers', 'Zapatillas')],
        ['flats', L('Ballerines et mocassins', 'Flats and loafers', 'Bailarinas y mocasines')],
        ['other', L('Autres', 'Other', 'Otros')],
      ]),
      group('women.bags', L('Sacs', 'Bags', 'Bolsos'), 'one', [
        ['handbags', L('Sacs à main', 'Handbags', 'Bolsos de mano')],
        ['clutches', L('Pochettes et minaudières', 'Clutches', 'Clutches y bolsos de fiesta')],
        ['shoulder', L('Sacs portés épaule', 'Shoulder bags', 'Bolsos de hombro')],
        ['totes', L('Cabas', 'Totes', 'Bolsos tote')],
        ['other', L('Autres', 'Other', 'Otros')],
      ]),
      group('women.accessories', L('Accessoires', 'Accessories', 'Accesorios'), 'one', [
        ['belts', L('Ceintures', 'Belts', 'Cinturones')],
        ['hats', L('Chapeaux et bibis', 'Hats and fascinators', 'Sombreros y tocados')],
        ['scarves', L('Écharpes et foulards', 'Scarves', 'Bufandas y pañuelos')],
        ['sunglasses', L('Lunettes de soleil', 'Sunglasses', 'Gafas de sol')],
        ['gloves', L('Gants', 'Gloves', 'Guantes')],
        ['hair', L('Accessoires cheveux', 'Hair accessories', 'Accesorios de pelo')],
        ['other', L('Autres', 'Other', 'Otros')],
      ]),
      group('women.jewellery', L('Bijoux et montres', 'Jewellery and watches', 'Joyas y relojes'), 'one', [
        ['necklaces', L('Colliers', 'Necklaces', 'Collares')],
        ['earrings', L('Boucles d’oreilles', 'Earrings', 'Pendientes')],
        ['bracelets', L('Bracelets', 'Bracelets', 'Pulseras')],
        ['rings', L('Bagues', 'Rings', 'Anillos')],
        ['watches', L('Montres', 'Watches', 'Relojes')],
      ]),
    ],
  },
  {
    id: 'men',
    label: L('Hommes', 'Men', 'Hombre'),
    icon: '👔',
    children: [
      group('men.clothing', L('Vêtements', 'Clothing', 'Ropa'), 'letters', [
        ['suits', L('Costumes et blazers', 'Suits and blazers', 'Trajes y blazers')],
        ['tuxedos', L('Smokings', 'Tuxedos', 'Esmóquines')],
        ['shirts', L('Chemises', 'Shirts', 'Camisas')],
        ['coats', L('Manteaux et vestes', 'Coats and jackets', 'Abrigos y chaquetas')],
        ['knit', L('Pulls et sweats', 'Jumpers and sweatshirts', 'Jerséis y sudaderas')],
        ['tops', L('Hauts et t-shirts', 'Tops and T-shirts', 'Camisetas y tops')],
        ['trousers', L('Pantalons', 'Trousers', 'Pantalones')],
        ['jeans', L('Jeans', 'Jeans', 'Vaqueros')],
        ['shorts', L('Shorts', 'Shorts', 'Pantalones cortos')],
        ['sport', L('Tenues de sport', 'Sportswear', 'Ropa deportiva')],
        ['costumes', L('Costumes et déguisements', 'Costumes', 'Disfraces')],
        ['other', L('Autres', 'Other', 'Otros')],
      ]),
      group('men.shoes', L('Chaussures', 'Shoes', 'Zapatos'), 'shoes', [
        ['formal', L('Chaussures habillées', 'Formal shoes', 'Zapatos de vestir')],
        ['sneakers', L('Baskets', 'Trainers', 'Zapatillas')],
        ['boots', L('Bottes et boots', 'Boots', 'Botas')],
        ['loafers', L('Mocassins', 'Loafers', 'Mocasines')],
        ['other', L('Autres', 'Other', 'Otros')],
      ]),
      group('men.accessories', L('Accessoires', 'Accessories', 'Accesorios'), 'one', [
        ['ties', L('Cravates et nœuds papillon', 'Ties and bow ties', 'Corbatas y pajaritas')],
        ['belts', L('Ceintures', 'Belts', 'Cinturones')],
        ['hats', L('Chapeaux', 'Hats', 'Sombreros')],
        ['sunglasses', L('Lunettes de soleil', 'Sunglasses', 'Gafas de sol')],
        ['bags', L('Sacs et maroquinerie', 'Bags and leather goods', 'Bolsos y marroquinería')],
        ['other', L('Autres', 'Other', 'Otros')],
      ]),
      group('men.jewellery', L('Bijoux et montres', 'Jewellery and watches', 'Joyas y relojes'), 'one', [
        ['watches', L('Montres', 'Watches', 'Relojes')],
        ['cufflinks', L('Boutons de manchette', 'Cufflinks', 'Gemelos')],
        ['bracelets', L('Bracelets', 'Bracelets', 'Pulseras')],
        ['rings', L('Bagues', 'Rings', 'Anillos')],
      ]),
    ],
  },
  {
    id: 'kids',
    label: L('Enfants', 'Kids', 'Niños'),
    icon: '🧒',
    children: [
      group('kids.girls', L('Filles', 'Girls', 'Niñas'), 'kids', [
        ['ceremony', L('Robes et tenues de cérémonie', 'Ceremony dresses and outfits', 'Vestidos y trajes de ceremonia')],
        ['clothing', L('Vêtements', 'Clothing', 'Ropa')],
        ['costumes', L('Déguisements', 'Costumes', 'Disfraces')],
      ]),
      group('kids.boys', L('Garçons', 'Boys', 'Niños'), 'kids', [
        ['ceremony', L('Costumes et tenues de cérémonie', 'Ceremony suits and outfits', 'Trajes de ceremonia')],
        ['clothing', L('Vêtements', 'Clothing', 'Ropa')],
        ['costumes', L('Déguisements', 'Costumes', 'Disfraces')],
      ]),
      group('kids.baby', L('Bébés', 'Babies', 'Bebés'), 'baby', [
        ['ceremony', L('Tenues de cérémonie', 'Ceremony outfits', 'Ropa de ceremonia')],
        ['clothing', L('Vêtements', 'Clothing', 'Ropa')],
      ]),
      group('kids.shoes', L('Chaussures', 'Shoes', 'Zapatos'), 'shoes', [
        ['ceremony', L('Chaussures de cérémonie', 'Ceremony shoes', 'Zapatos de ceremonia')],
        ['other', L('Autres', 'Other', 'Otros')],
      ]),
    ],
  },
];

/** Every leaf, with the labels of its parents, for search and lookups. */
export interface CategoryLeaf {
  id: string;
  label: Label;
  path: Label[];
  sizeKind: SizeKind;
}

export const CATEGORY_LEAVES: CategoryLeaf[] = (() => {
  const out: CategoryLeaf[] = [];
  const walk = (nodes: CategoryNode[], path: Label[]) => {
    for (const n of nodes) {
      if (n.children) walk(n.children, [...path, n.label]);
      else out.push({ id: n.id, label: n.label, path, sizeKind: n.sizeKind ?? 'letters' });
    }
  };
  walk(CATEGORY_TREE, []);
  return out;
})();

export const findLeaf = (id: string | null | undefined) => CATEGORY_LEAVES.find((l) => l.id === id) ?? null;

export const SIZE_SCALES: Record<SizeKind, string[]> = {
  letters: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'],
  shoes: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'],
  kids: ['2A', '3A', '4A', '5A', '6A', '8A', '10A', '12A', '14A', '16A'],
  baby: ['1M', '3M', '6M', '9M', '12M', '18M', '24M'],
  one: ['TU'],
};

/** Occasion wear rents for more per day than everyday pieces. */
const OCCASION_LEAVES = /\.(evening|bridal|guest|tuxedos|ceremony|clutches|jumpsuits)$/;
const EVERYDAY_LEAVES = /\.(tops|knit|jeans|shorts|sport|trousers|sneakers|other)$/;

// ── Brands ─────────────────────────────────────────────────────

export interface Brand {
  name: string;
  /** Often counterfeited: proof of authenticity is required to list it. */
  luxury?: boolean;
}

const LUXURY = [
  'Alaïa', 'Alexander McQueen', 'Balenciaga', 'Balmain', 'Bottega Veneta', 'Boucheron', 'Bulgari', 'Burberry',
  'Cartier', 'Celine', 'Chanel', 'Chloé', 'Chopard', 'Christian Louboutin', 'Delvaux', 'Dior', 'Dolce & Gabbana',
  'Elie Saab', 'Fendi', 'Givenchy', 'Goyard', 'Gucci', 'Hermès', 'Jean Paul Gaultier', 'Jil Sander', 'Jimmy Choo',
  'Lanvin', 'Loewe', 'Louis Vuitton', 'Maison Margiela', 'Manolo Blahnik', 'Marni', 'Messika', 'Miu Miu', 'Moncler',
  'Moschino', 'Mugler', 'Off-White', 'Prada', 'Rabanne', 'Rick Owens', 'Roger Vivier', 'Rolex', 'Saint Laurent',
  'Stella McCartney', 'Tiffany & Co.', 'Valentino', 'Van Cleef & Arpels', 'Versace', 'Zuhair Murad',
];

const OTHERS = [
  '& Other Stories', 'A.P.C.', 'Acne Studios', 'Adidas', 'American Vintage', 'Ami Paris', 'Anthropologie', 'Asos',
  'Aubade', 'ba&sh', 'Bershka', 'Bonpoint', 'Calvin Klein', 'Carhartt', 'Claudie Pierlot', 'Coach', 'Comptoir des Cotonniers',
  'COS', 'Courrèges', 'Cyrillus', 'Des Petits Hauts', 'Diesel', 'Etam', 'Free People', 'Ganni', 'Gerard Darel', 'Guess',
  'H&M', 'Hugo Boss', 'Iro', 'Isabel Marant', 'Jacadi', 'Jacquemus', 'Jonak', 'Karl Lagerfeld', 'Kenzo', 'Kiabi',
  'Kookaï', 'Lacoste', 'Lancel', 'Levi’s', 'Longchamp', 'Maison Kitsuné', 'Maje', 'Mango', 'Marc Jacobs',
  'Massimo Dutti', 'Michael Kors', 'Minelli', 'Morgan', 'Nanushka', 'Naf Naf', 'Needle & Thread', 'Nike',
  'Petit Bateau', 'Polène', 'Princesse tam.tam', 'Promod', 'Pronovias', 'Pull&Bear', 'Ralph Lauren', 'Réalisation Par',
  'Reformation', 'Rixo', 'Rosa Clará', 'Rouje', 'Sandro', 'San Marina', 'Self-Portrait', 'Sessùn', 'Sézane',
  'Stone Island', 'Stradivarius', 'Tartine et Chocolat', 'The Kooples', 'Tommy Hilfiger', 'Tory Burch', 'Uniqlo',
  'Vanessa Bruno', 'Veja', 'Zadig & Voltaire', 'Zara',
];

export const BRANDS: Brand[] = [
  ...LUXURY.map((name) => ({ name, luxury: true })),
  ...OTHERS.map((name) => ({ name })),
].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

/** Shown first in the brand picker: what people rent most in Paris. */
export const POPULAR_BRANDS = ['Sézane', 'Maje', 'Sandro', 'Réalisation Par', 'Zara', 'Rouje', 'ba&sh', 'Jacquemus'];

/**
 * Brand names compared without case, accents or punctuation, the same way
 * the database does (migration 008): "Chloé" = "chloe", "D&G" = "dg".
 */
export const normalizeBrand = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const LUXURY_ALIASES = ['lv', 'ysl', 'dg', 'vca', 'yves saint laurent', 'christian dior', 'louboutin', 'mcqueen', 'margiela'];

export const LUXURY_KEYS: string[] = [...LUXURY, ...LUXURY_ALIASES].map(normalizeBrand);

export function isLuxury(brand: string, extra: string[] = []) {
  const key = normalizeBrand(brand);
  return !!key && (LUXURY_KEYS.includes(key) || extra.includes(key));
}

// ── Price advice ───────────────────────────────────────────────

/**
 * A daily price from what the piece cost new. Peer-to-peer rental
 * platforms advise 3 to 5 % of the retail price per day (By Rotation's
 * smart pricing); occasion wear sits at the top of that band, everyday
 * pieces at the bottom. Never under 5 € a day.
 */
export function suggestDailyPrice(purchasePrice: number, categoryId: string | null) {
  if (!purchasePrice || purchasePrice < 20) return null;
  const rate = categoryId && OCCASION_LEAVES.test(categoryId) ? 0.045 : categoryId && EVERYDAY_LEAVES.test(categoryId) ? 0.035 : 0.04;
  const clamp = (n: number) => Math.min(1000, Math.max(5, Math.round(n)));
  return { low: clamp(purchasePrice * 0.03), high: clamp(purchasePrice * 0.05), best: clamp(purchasePrice * rate) };
}
