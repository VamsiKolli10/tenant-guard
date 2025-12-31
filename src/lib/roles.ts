export const roles = ["ADMIN", "MANAGER", "MEMBER"] as const;
export type Role = (typeof roles)[number];
