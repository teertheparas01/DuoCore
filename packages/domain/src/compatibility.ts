import { AidBatch, Receiver, ReceiverRequest } from './models';

export interface CompatibilityResult {
  compatible: boolean;
  reasons: string[];
}

export function evaluateCompatibility(batch: AidBatch, receiver: Receiver, request: ReceiverRequest): CompatibilityResult {
  const reasons: string[] = [];
  const requiredCapabilities = batch.requirements.requiredCapabilities ?? [];
  const missingCapabilities = requiredCapabilities.filter(
    (capability) => !receiver.capabilities.includes(capability),
  );
  if (missingCapabilities.length > 0) {
    reasons.push(
      `Allocation blocked for ${receiver.name}: missing confirmed capabilities: ${missingCapabilities.join(', ')}.`,
    );
  }

  const requiredStorage = batch.requirements.requiredStorageConditions ?? [];
  const missingStorage = requiredStorage.filter(
    (condition) => !receiver.storageConditions.includes(condition),
  );
  if (missingStorage.length > 0) {
    reasons.push(
      `Allocation blocked for ${receiver.name}: missing confirmed storage conditions: ${missingStorage.join(', ')}.`,
    );
  }

  if (batch.requirements.requiresFragileHandling && !receiver.capabilities.includes('FRAGILE_HANDLING')) {
    reasons.push(`Allocation blocked for ${receiver.name}: fragile handling is not confirmed.`);
  }

  if (request.unit !== batch.unit) {
    reasons.push(`Allocation blocked for ${receiver.name}: request unit ${request.unit} does not match batch unit ${batch.unit}.`);
  }

  return { compatible: reasons.length === 0, reasons };
}
