import type { PricingTable } from '../data/pricing';
import type { PainId } from '../engine/events';

export interface EstimateSelection {
  pain?: PainId;
  services: string[];
  complexity?: 'simple' | 'medium' | 'enterprise';
  urgency?: 'standard' | 'urgent';
  supportMonths?: number;
}

export interface EstimateResult {
  minPriceUsd: number;
  maxPriceUsd: number;
  minDays: number;
  maxDays: number;
  resolvedServices: string[];
}

export function estimate(selection: EstimateSelection, table: PricingTable): EstimateResult {
  let resolvedServices = [...selection.services];
  if (resolvedServices.length === 0 && selection.pain && table.painDefaults[selection.pain]) {
    const defaults = table.painDefaults[selection.pain];
    if (defaults) {
      resolvedServices = [...defaults];
    }
  }

  if (resolvedServices.length === 0) {
    return {
      minPriceUsd: 0,
      maxPriceUsd: 0,
      minDays: 0,
      maxDays: 0,
      resolvedServices: [],
    };
  }

  const complexity = selection.complexity ?? 'medium';
  const urgency = selection.urgency ?? 'standard';
  const supportMonths = Math.max(0, selection.supportMonths ?? 0);

  const complexityMult = table.complexityMultipliers[complexity] ?? 1.0;
  const urgencyPriceMult = table.urgencyPriceMultiplier[urgency] ?? 1.0;
  const urgencyDaysMult = table.urgencyDaysMultiplier[urgency] ?? 1.0;

  let baseMinPrice = 0;
  let baseMaxPrice = 0;
  const minDaysArr: number[] = [];
  const maxDaysArr: number[] = [];

  for (const sId of resolvedServices) {
    const s = table.services[sId];
    if (s) {
      baseMinPrice += s.minPrice;
      baseMaxPrice += s.maxPrice;
      minDaysArr.push(s.minDays);
      maxDaysArr.push(s.maxDays);
    }
  }

  if (minDaysArr.length === 0) {
    return {
      minPriceUsd: 0,
      maxPriceUsd: 0,
      minDays: 0,
      maxDays: 0,
      resolvedServices: [],
    };
  }

  minDaysArr.sort((a, b) => b - a);
  maxDaysArr.sort((a, b) => b - a);

  const primaryMin = minDaysArr[0] ?? 0;
  const remainingMin = minDaysArr.slice(1).reduce((acc, v) => acc + v, 0);
  const combinedMinDays = Math.round((primaryMin + remainingMin * 0.2) * urgencyDaysMult);

  const primaryMax = maxDaysArr[0] ?? 0;
  const remainingMax = maxDaysArr.slice(1).reduce((acc, v) => acc + v, 0);
  const combinedMaxDays = Math.round((primaryMax + remainingMax * 0.25) * urgencyDaysMult);

  const supportCost = supportMonths * table.supportMonthlyCostUsd;
  const finalMinPrice = Math.round(baseMinPrice * complexityMult * urgencyPriceMult) + supportCost;
  const finalMaxPrice = Math.round(baseMaxPrice * complexityMult * urgencyPriceMult) + supportCost;

  return {
    minPriceUsd: finalMinPrice,
    maxPriceUsd: finalMaxPrice,
    minDays: combinedMinDays,
    maxDays: combinedMaxDays,
    resolvedServices,
  };
}
