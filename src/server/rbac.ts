import { Role } from "@prisma/client";

const roleRank: Record<Role, number> = {
  ADMIN: 3,
  MANAGER: 2,
  MEMBER: 1,
};

export function hasRole(actual: Role, allowed: Role[]) {
  return allowed.includes(actual);
}

export function hasAtLeastRole(actual: Role, minimum: Role) {
  return roleRank[actual] >= roleRank[minimum];
}
