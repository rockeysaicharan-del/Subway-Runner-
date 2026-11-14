export type SkinId = '2002' | '2004' | '2007' | '2016' | '2018-2019';

export interface SuitSkin {
  id: SkinId;
  yearLabel: string;
  name: string;
  subtitle: string;
  costCoins: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  webColor: string;
  spiderColor: string;
  lensColor: string;
  lensRimColor: string;
  lensEmissive: string;
  lensEmissiveIntensity: number;
  suitRoughness: number;
  suitMetalness: number;
  suitClearcoat: number;
  patternType: 'homemade' | 'raimi' | 'symbiote' | 'tactical' | 'iron';
  skinCutoutFace: boolean;
  wristCuffs: boolean;
  goldArmorTrim: boolean;
  emissiveChestSpider: boolean;
}

export const SUIT_SKINS: readonly SuitSkin[] = [
  {
    id: '2002',
    yearLabel: '2002',
    name: 'Homemade Suit',
    subtitle: 'Default · Crimson Knit & Denim',
    costCoins: 0,
    primaryColor: '#d91e2a',
    secondaryColor: '#25426b',
    accentColor: '#171717',
    webColor: '#8d111a',
    spiderColor: '#111111',
    lensColor: '#f3d1bd',
    lensRimColor: '#b91c1c',
    lensEmissive: '#000000',
    lensEmissiveIntensity: 0,
    suitRoughness: 0.86,
    suitMetalness: 0.04,
    suitClearcoat: 0.0,
    patternType: 'homemade',
    skinCutoutFace: true,
    wristCuffs: false,
    goldArmorTrim: false,
    emissiveChestSpider: false,
  },
  {
    id: '2004',
    yearLabel: '2004',
    name: 'Classic Web Suit',
    subtitle: 'Raised Silver Webbing',
    costCoins: 100,
    primaryColor: '#b91c1c',
    secondaryColor: '#1e3a6e',
    accentColor: '#d4d4d8',
    webColor: '#cfd5df',
    spiderColor: '#18181b',
    lensColor: '#e5e7eb',
    lensRimColor: '#9ca3af',
    lensEmissive: '#ffffff',
    lensEmissiveIntensity: 0.12,
    suitRoughness: 0.52,
    suitMetalness: 0.22,
    suitClearcoat: 0.15,
    patternType: 'raimi',
    skinCutoutFace: false,
    wristCuffs: false,
    goldArmorTrim: false,
    emissiveChestSpider: false,
  },
  {
    id: '2007',
    yearLabel: '2007',
    name: 'Symbiote Black Suit',
    subtitle: 'Obsidian Gloss & Silver Emblem',
    costCoins: 200,
    primaryColor: '#14161a',
    secondaryColor: '#0b0d10',
    accentColor: '#e4e4e7',
    webColor: '#4b5563',
    spiderColor: '#f4f4f5',
    lensColor: '#f1f5f9',
    lensRimColor: '#52525b',
    lensEmissive: '#e2e8f0',
    lensEmissiveIntensity: 0.16,
    suitRoughness: 0.24,
    suitMetalness: 0.35,
    suitClearcoat: 0.78,
    patternType: 'symbiote',
    skinCutoutFace: false,
    wristCuffs: false,
    goldArmorTrim: false,
    emissiveChestSpider: false,
  },
  {
    id: '2016',
    yearLabel: '2016',
    name: 'Tactical Tech Suit',
    subtitle: 'Scarlet Weave & Carbon Trim',
    costCoins: 500,
    primaryColor: '#dc2626',
    secondaryColor: '#1d4ed8',
    accentColor: '#18181b',
    webColor: '#7f1d1d',
    spiderColor: '#09090b',
    lensColor: '#f8fafc',
    lensRimColor: '#09090b',
    lensEmissive: '#ffffff',
    lensEmissiveIntensity: 0.15,
    suitRoughness: 0.68,
    suitMetalness: 0.08,
    suitClearcoat: 0.05,
    patternType: 'tactical',
    skinCutoutFace: false,
    wristCuffs: true,
    goldArmorTrim: false,
    emissiveChestSpider: false,
  },
  {
    id: '2018-2019',
    yearLabel: '2018-2019',
    name: 'Iron Armor Suit',
    subtitle: 'Final Suit · Metallic Gold & Cyan Core',
    costCoins: 1000,
    primaryColor: '#991b1b',
    secondaryColor: '#0f172a',
    accentColor: '#eab308',
    webColor: '#d97706',
    spiderColor: '#38bdf8',
    lensColor: '#38bdf8',
    lensRimColor: '#fbbf24',
    lensEmissive: '#38bdf8',
    lensEmissiveIntensity: 0.9,
    suitRoughness: 0.22,
    suitMetalness: 0.85,
    suitClearcoat: 0.65,
    patternType: 'iron',
    skinCutoutFace: false,
    wristCuffs: true,
    goldArmorTrim: true,
    emissiveChestSpider: true,
  },
] as const;

export const DEFAULT_SKIN_ID: SkinId = '2002';

export function getSkinById(id: SkinId): SuitSkin {
  return SUIT_SKINS.find((skin) => skin.id === id) ?? SUIT_SKINS[0];
}
