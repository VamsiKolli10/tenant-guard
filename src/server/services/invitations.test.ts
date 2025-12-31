import { expect, it } from "vitest";

import { prisma } from "@/server/db";
import { createOrganization } from "@/server/services/organizations";
import {
  acceptInvitation,
  createInvitation,
  revokeInvitation,
} from "@/server/services/invitations";
import { createUser } from "@/server/services/users";

it("creates and accepts an invitation with audit trail", async () => {
  const admin = await createUser({
    email: "owner@example.com",
    name: "Owner",
    password: "password123",
  });

  const invitee = await createUser({
    email: "invitee@example.com",
    name: "Invitee",
    password: "password123",
  });

  const org = await createOrganization({
    name: "Helios",
    ownerId: admin.id,
  });

  const { invitation, token } = await createInvitation({
    orgId: org.id,
    email: invitee.email,
    role: "MEMBER",
    invitedByUserId: admin.id,
  });

  const membership = await acceptInvitation({
    token,
    userId: invitee.id,
  });

  expect(membership.orgId).toBe(org.id);
  expect(membership.role).toBe("MEMBER");

  const acceptedAudit = await prisma.auditLog.findFirst({
    where: { orgId: org.id, action: "org.invite.accepted" },
  });

  expect(acceptedAudit).not.toBeNull();
});

it("revokes an invitation and logs the action", async () => {
  const admin = await createUser({
    email: "admin2@example.com",
    name: "Admin Two",
    password: "password123",
  });

  const org = await createOrganization({
    name: "Nimbus",
    ownerId: admin.id,
  });

  const { invitation } = await createInvitation({
    orgId: org.id,
    email: "revoked@example.com",
    role: "MEMBER",
    invitedByUserId: admin.id,
  });

  const revoked = await revokeInvitation({
    invitationId: invitation.id,
    actorId: admin.id,
    orgId: org.id,
  });

  expect(revoked.revokedAt).not.toBeNull();

  const revokedAudit = await prisma.auditLog.findFirst({
    where: { orgId: org.id, action: "org.invite.revoked" },
  });

  expect(revokedAudit).not.toBeNull();
});
