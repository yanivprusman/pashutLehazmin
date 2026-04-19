import type { Chain } from './feeds/types';

export interface ChainMeta {
  id: Chain;
  label: string;
  labelHe: string;
  deliveryFee: number;
  deliveryMinimum: number;
  cartUrl: string;
}

export const CHAIN_META: Record<Chain, ChainMeta> = {
  shufersal: {
    id: 'shufersal',
    label: 'Shufersal Deal',
    labelHe: 'שופרסל דיל',
    deliveryFee: 30,
    deliveryMinimum: 250,
    cartUrl: 'https://www.shufersal.co.il/online/he/A',
  },
  ramilevi: {
    id: 'ramilevi',
    label: 'Rami Levi',
    labelHe: 'רמי לוי',
    deliveryFee: 25,
    deliveryMinimum: 200,
    cartUrl: 'https://www.rami-levy.co.il/he',
  },
};

export const ALL_CHAINS: Chain[] = ['shufersal', 'ramilevi'];
