'use client';

import {
  attachRuleToDirectorySchema,
  createRuleSchema,
  deleteRuleSchema,
  detachRuleFromDirectorySchema,
  parseRequest,
  updateRuleSchema,
  type AttachRuleToDirectoryResponse,
  type CreateRuleResponse,
  type DeleteRuleResponse,
  type DetachRuleFromDirectoryResponse,
  type UpdateRuleResponse,
} from '@sf/shared-types';
import { postJson } from './client';

export async function createRule(input: {
  name: string;
  description?: string;
  content: string;
  isDefault?: boolean;
}) {
  const body = parseRequest(createRuleSchema, input);
  const payload = await postJson<CreateRuleResponse>('create-rule', body);
  return payload.rule;
}

export async function updateRule(input: {
  ruleId: string;
  name?: string;
  description?: string;
  content?: string;
  isDefault?: boolean;
}) {
  const body = parseRequest(updateRuleSchema, input);
  const payload = await postJson<UpdateRuleResponse>('update-rule', body);
  return payload.rule;
}

export async function deleteRule(ruleId: string) {
  const body = parseRequest(deleteRuleSchema, { ruleId });
  const payload = await postJson<DeleteRuleResponse>('delete-rule', body);
  return payload.success;
}

export async function attachRuleToDirectory(directoryId: string, ruleId: string) {
  const body = parseRequest(attachRuleToDirectorySchema, { directoryId, ruleId });
  const payload = await postJson<AttachRuleToDirectoryResponse>('attach-rule-to-directory', body);
  return payload.success;
}

export async function detachRuleFromDirectory(directoryId: string, ruleId: string) {
  const body = parseRequest(detachRuleFromDirectorySchema, { directoryId, ruleId });
  const payload = await postJson<DetachRuleFromDirectoryResponse>(
    'detach-rule-from-directory',
    body,
  );
  return payload.success;
}
