import "server-only";

import { Resend } from "resend";

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;

  if (!apiKey || !from || !appUrl) {
    throw new Error(
      "RESEND_API_KEY, EMAIL_FROM, and NEXT_PUBLIC_APP_URL are required for email delivery.",
    );
  }

  return { apiKey, from, appUrl };
}

async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const { apiKey, from } = getEmailConfig();
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  if (error) {
    throw new Error(`Email delivery failed: ${error.name}`);
  }

  return data;
}

function actionUrl(path: string, token: string) {
  const { appUrl } = getEmailConfig();
  const url = new URL(path, appUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export function sendEmailVerification(to: string, token: string) {
  const url = actionUrl("/verify-email", token);
  return sendEmail({
    to,
    subject: "Verify your Tenant Guard email",
    text: `Verify your email by opening this link: ${url}\n\nIf you did not create this account, you can ignore this email.`,
    html: `<p>Verify your email to finish setting up Tenant Guard.</p><p><a href="${url}">Verify email</a></p><p>If you did not create this account, you can ignore this email.</p>`,
  });
}

export function sendPasswordReset(to: string, token: string) {
  const url = actionUrl("/reset-password", token);
  return sendEmail({
    to,
    subject: "Reset your Tenant Guard password",
    text: `Reset your password by opening this link: ${url}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>A password reset was requested for your Tenant Guard account.</p><p><a href="${url}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });
}

export function sendOrganizationInvitation(input: {
  to: string;
  token: string;
  organizationName: string;
}) {
  const { appUrl } = getEmailConfig();
  const url = new URL(
    `/invite/${encodeURIComponent(input.token)}`,
    appUrl,
  ).toString();
  return sendEmail({
    to: input.to,
    subject: `You're invited to ${input.organizationName} on Tenant Guard`,
    text: `Accept the invitation by opening this link: ${url}`,
    html: `<p>You have been invited to join ${input.organizationName} on Tenant Guard.</p><p><a href="${url}">Accept invitation</a></p>`,
  });
}
