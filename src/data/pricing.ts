import type { PainId } from '../engine/events';

export interface ServicePricing {
  id: string;
  minPrice: number;
  maxPrice: number;
  minDays: number;
  maxDays: number;
}

export interface PricingTable {
  services: Record<string, ServicePricing>;
  complexityMultipliers: {
    simple: number;
    medium: number;
    enterprise: number;
  };
  urgencyPriceMultiplier: {
    standard: number;
    urgent: number;
  };
  urgencyDaysMultiplier: {
    standard: number;
    urgent: number;
  };
  supportMonthlyCostUsd: number;
  /** Services preselected in the calculator for the pain picked on the roof. */
  painDefaults: Record<PainId, string[]>;
}

export const defaultPricingTable: PricingTable = {
  services: {
    agents: {
      id: 'agents',
      minPrice: 1500,
      maxPrice: 3500,
      minDays: 7,
      maxDays: 21,
    },
    crm: {
      id: 'crm',
      minPrice: 1800,
      maxPrice: 4000,
      minDays: 10,
      maxDays: 28,
    },
    booking: {
      id: 'booking',
      minPrice: 1200,
      maxPrice: 2800,
      minDays: 5,
      maxDays: 14,
    },
    web: {
      id: 'web',
      minPrice: 2000,
      maxPrice: 5000,
      minDays: 14,
      maxDays: 35,
    },
  },
  complexityMultipliers: {
    simple: 0.85,
    medium: 1.0,
    enterprise: 1.6,
  },
  urgencyPriceMultiplier: {
    standard: 1.0,
    urgent: 1.3,
  },
  urgencyDaysMultiplier: {
    standard: 1.0,
    urgent: 0.65,
  },
  supportMonthlyCostUsd: 300,
  painDefaults: {
    'lost-leads': ['agents', 'crm'],
    'manual-routine': ['crm', 'agents'],
    'need-site': ['web'],
    'need-booking': ['booking'],
    browsing: ['agents'],
  },
};
