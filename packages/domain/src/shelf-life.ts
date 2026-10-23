import {
  AidCategory,
  AidBatch,
  ExpiryEstimate,
  StorageCondition,
} from './models';

export interface ShelfLifeRule {
  category: AidCategory;
  storageCondition: StorageCondition;
  minutes: number;
  confidence: ExpiryEstimate['confidence'];
}

export interface ShelfLifeInput {
  category: AidCategory;
  storageCondition: StorageCondition;
  createdAt: string;
  preparedAt?: string;
  donorExpiry?: string;
  itemName?: string;
}

/**
 * These are operational demo values for simulation only. They are not food,
 * medical, or product-safety advice and must be replaced by an approved policy
 * before any real-world deployment.
 */
export const DEFAULT_SHELF_LIFE_RULES: ShelfLifeRule[] = [
  { category: 'COOKED_FOOD', storageCondition: 'AMBIENT', minutes: 90, confidence: 'LOW' },
  { category: 'COOKED_FOOD', storageCondition: 'REFRIGERATED', minutes: 240, confidence: 'LOW' },
  { category: 'COOKED_FOOD', storageCondition: 'FROZEN', minutes: 1_440, confidence: 'LOW' },
  { category: 'RAW_RATION_KITS', storageCondition: 'AMBIENT', minutes: 1_440, confidence: 'MEDIUM' },
  { category: 'RAW_RATION_KITS', storageCondition: 'REFRIGERATED', minutes: 2_880, confidence: 'MEDIUM' },
  { category: 'RAW_RATION_KITS', storageCondition: 'FROZEN', minutes: 10_080, confidence: 'MEDIUM' },
  { category: 'INFANT_FORMULA', storageCondition: 'AMBIENT', minutes: 120, confidence: 'LOW' },
  { category: 'INFANT_FORMULA', storageCondition: 'REFRIGERATED', minutes: 240, confidence: 'LOW' },
  { category: 'INFANT_FORMULA', storageCondition: 'FROZEN', minutes: 1_440, confidence: 'LOW' },
  { category: 'ESSENTIAL_RELIEF_KITS', storageCondition: 'AMBIENT', minutes: 4_320, confidence: 'MEDIUM' },
  { category: 'ESSENTIAL_RELIEF_KITS', storageCondition: 'REFRIGERATED', minutes: 4_320, confidence: 'MEDIUM' },
  { category: 'ESSENTIAL_RELIEF_KITS', storageCondition: 'FROZEN', minutes: 4_320, confidence: 'MEDIUM' },
];

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function minIso(left: string, right: string): string {
  return new Date(left).getTime() <= new Date(right).getTime() ? left : right;
}

export function estimateShelfLife(
  input: ShelfLifeInput,
  rules: ShelfLifeRule[] = DEFAULT_SHELF_LIFE_RULES,
): ExpiryEstimate {
  const baseTime = input.preparedAt ?? input.createdAt;
  const rule = rules.find(
    (candidate) => candidate.category === input.category && candidate.storageCondition === input.storageCondition,
  );

  if (!rule) {
    return {
      expiresAt: input.donorExpiry ?? addMinutes(baseTime, 60),
      confidence: 'LOW',
      source: input.donorExpiry ? 'DONOR' : 'RULE_BASED',
      warning: 'No configured rule matched this category and storage condition; manual review is required.',
    };
  }

  const ruleExpiry = addMinutes(baseTime, rule.minutes);
  if (!input.donorExpiry) {
    return {
      expiresAt: ruleExpiry,
      confidence: rule.confidence,
      source: 'RULE_BASED',
      warning: rule.confidence === 'LOW' ? 'Low-confidence operational estimate; coordinator review is recommended.' : undefined,
    };
  }

  const saferExpiry = minIso(input.donorExpiry, ruleExpiry);
  const donorWasSafer = saferExpiry === input.donorExpiry;
  return {
    expiresAt: saferExpiry,
    confidence: donorWasSafer ? 'HIGH' : rule.confidence,
    source: 'SAFER_OF_DONOR_AND_RULE',
    warning: donorWasSafer ? undefined : 'Rule-based estimate is earlier than the donor-provided expiry and was selected conservatively.',
  };
}

export function applyExpiryEstimate(batch: AidBatch, estimate: ExpiryEstimate): AidBatch {
  return {
    ...batch,
    ruleBasedExpiry: estimate.source === 'DONOR' ? batch.ruleBasedExpiry : estimate,
    effectiveExpiry: estimate.expiresAt,
    expiryConfidence: estimate.confidence,
    expiryWarning: estimate.warning,
  };
}
