import { describe, expect, it } from "vitest";

import {
  TenantContextError,
  TenantIsolationError,
  createTenantGuard,
  scopeArgs,
} from "@/server/tenant-guard";

const ORG = "org_alpha";
const OTHER = "org_beta";

describe("scopeArgs", () => {
  it("leaves non-tenant models untouched", () => {
    const args = { where: { email: "a@b.test" } };
    expect(scopeArgs("User", "findUnique", args, ORG)).toBe(args);
  });

  it("pins a bare findMany to the ambient org", () => {
    expect(scopeArgs("Task", "findMany", {}, ORG)).toEqual({
      where: { orgId: ORG },
    });
  });

  it("adds orgId to an existing where without dropping filters", () => {
    const scoped = scopeArgs(
      "Task",
      "findMany",
      { where: { status: "TODO" }, take: 10 },
      ORG,
    );

    expect(scoped).toEqual({
      where: { status: "TODO", orgId: ORG },
      take: 10,
    });
  });

  it("keeps the unique field at the top level for findUnique", () => {
    // Nesting inside AND would strip the unique constraint Prisma requires.
    const scoped = scopeArgs("Task", "findUnique", { where: { id: "t1" } }, ORG);
    expect(scoped).toEqual({ where: { id: "t1", orgId: ORG } });
  });

  it("constrains a caller-supplied OR, because siblings are ANDed", () => {
    const scoped = scopeArgs(
      "Task",
      "findMany",
      { where: { OR: [{ title: { contains: "x" } }, { id: "t9" }] } },
      ORG,
    ) as { where: Record<string, unknown> };

    expect(scoped.where.orgId).toBe(ORG);
    expect(scoped.where.OR).toHaveLength(2);
  });

  it("blocks a query that names a different org", () => {
    expect(() =>
      scopeArgs("Task", "findFirst", { where: { id: "t1", orgId: OTHER } }, ORG),
    ).toThrow(TenantIsolationError);
  });

  it("allows a query that names the same org", () => {
    expect(
      scopeArgs("Task", "findFirst", { where: { id: "t1", orgId: ORG } }, ORG),
    ).toEqual({ where: { id: "t1", orgId: ORG } });
  });

  it("pins orgId on create", () => {
    expect(
      scopeArgs("Task", "create", { data: { title: "x" } }, ORG),
    ).toEqual({ data: { title: "x", orgId: ORG } });
  });

  it("blocks a create that names a different org", () => {
    expect(() =>
      scopeArgs("Task", "create", { data: { title: "x", orgId: OTHER } }, ORG),
    ).toThrow(TenantIsolationError);
  });

  it("pins every row of a createMany", () => {
    expect(
      scopeArgs("Task", "createMany", { data: [{ title: "a" }, { title: "b" }] }, ORG),
    ).toEqual({
      data: [
        { title: "a", orgId: ORG },
        { title: "b", orgId: ORG },
      ],
    });
  });

  it("scopes deleteMany, so a stray delete cannot cross tenants", () => {
    expect(scopeArgs("Task", "deleteMany", {}, ORG)).toEqual({
      where: { orgId: ORG },
    });
  });

  it("scopes both halves of an upsert", () => {
    const scoped = scopeArgs(
      "Membership",
      "upsert",
      { where: { id: "m1" }, create: { userId: "u1" }, update: { role: "ADMIN" } },
      ORG,
    );

    expect(scoped).toEqual({
      where: { id: "m1", orgId: ORG },
      create: { userId: "u1", orgId: ORG },
      update: { role: "ADMIN" },
    });
  });

  it("refuses an unrecognised operation rather than passing it through", () => {
    expect(() => scopeArgs("Task", "someFutureOperation", {}, ORG)).toThrow(
      TenantContextError,
    );
  });
});

describe("scopeArgs with no ambient organization", () => {
  // The guard must work where AsyncLocalStorage does not reach — notably inside
  // a Prisma interactive transaction. A query that scopes itself is allowed
  // through untouched; one that does not is still refused.

  it("allows a query that names its own org in the filter", () => {
    const args = { where: { id: "t1", orgId: ORG } };
    expect(scopeArgs("Task", "findFirst", args, null)).toBe(args);
  });

  it("allows a create that names its own org", () => {
    const args = { data: { title: "x", orgId: ORG } };
    expect(scopeArgs("Task", "create", args, null)).toBe(args);
  });

  it("recognises the Membership compound unique", () => {
    const args = { where: { userId_orgId: { userId: "u1", orgId: ORG } } };
    expect(scopeArgs("Membership", "findUnique", args, null)).toBe(args);
  });

  it("still refuses a bare lookup by id — the regression it exists to catch", () => {
    expect(() => scopeArgs("Task", "findUnique", { where: { id: "t1" } }, null)).toThrow(
      TenantContextError,
    );
  });

  it("still refuses an unscoped findMany", () => {
    expect(() => scopeArgs("Task", "findMany", {}, null)).toThrow(TenantContextError);
  });

  it("refuses a createMany whose rows disagree about the org", () => {
    expect(() =>
      scopeArgs(
        "Task",
        "createMany",
        { data: [{ title: "a", orgId: ORG }, { title: "b", orgId: OTHER }] },
        null,
      ),
    ).toThrow(TenantContextError);
  });
});

describe("createTenantGuard", () => {
  const passthrough = async (args: unknown) => args;

  it("throws when nothing scopes the query", async () => {
    const guard = createTenantGuard({
      getOrgContext: () => null,
    });

    await expect(
      guard({ model: "Task", operation: "findMany", args: {}, query: passthrough }),
    ).rejects.toThrow(TenantContextError);
  });

  it("passes through a self-scoped query with no ambient context", async () => {
    const guard = createTenantGuard({
      getOrgContext: () => null,
    });

    await expect(
      guard({
        model: "Membership",
        operation: "create",
        args: { data: { orgId: ORG, userId: "u1", role: "ADMIN" } },
        query: passthrough,
      }),
    ).resolves.toEqual({ data: { orgId: ORG, userId: "u1", role: "ADMIN" } });
  });

  it("scopes the query when an organization is bound", async () => {
    const guard = createTenantGuard({
      getOrgContext: () => ORG,
    });

    await expect(
      guard({ model: "Task", operation: "findMany", args: {}, query: passthrough }),
    ).resolves.toEqual({ where: { orgId: ORG } });
  });

  it("ignores models with no tenant column", async () => {
    const guard = createTenantGuard({
      getOrgContext: () => null,
    });

    await expect(
      guard({
        model: "User",
        operation: "findUnique",
        args: { where: { id: "u1" } },
        query: passthrough,
      }),
    ).resolves.toEqual({ where: { id: "u1" } });
  });
});
