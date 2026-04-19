export type Chain = 'shufersal' | 'ramilevi';

export interface NormalizedProduct {
  chain: Chain;
  storeId: string;
  itemCode: string;
  itemName: string;
  manufacturer?: string;
  unitOfMeasure?: string;
  quantity?: number;
  unitPrice?: number;
  itemPrice: number;
  isWeighted: boolean;
  lastUpdated: Date;
}

export interface ChainConfig {
  chainId: string;
  storeId: string;
  label: string;
}

export const V0_STORES: Record<Chain, ChainConfig> = {
  shufersal: {
    chainId: '7290027600007',
    storeId: '267',
    label: 'שופרסל דיל מצפה רמון',
  },
  ramilevi: {
    chainId: '7290058140886',
    storeId: '027',
    label: 'רמי לוי באר שבע (עמק שרה)',
  },
};
