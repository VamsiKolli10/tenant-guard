import { AsyncLocalStorage } from "node:async_hooks";

type OrgContext = {
  orgId: string;
};

const orgStore = new AsyncLocalStorage<OrgContext>();

export const TENANT_MODELS = new Set([
  "Membership",
  "Invitation",
  "Task",
  "AuditLog",
]);

export function setOrgContext(orgId: string) {
  orgStore.enterWith({ orgId });
}

export function getOrgContext() {
  return orgStore.getStore()?.orgId ?? null;
}
