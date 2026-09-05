"use client";

import { useState } from "react";

type Status = { tone: "success" | "danger"; message: string } | null;

function Notice({ status }: { status: Status }) {
  return (
    <div aria-live="polite" className="min-h-[1.5rem]">
      {status ? (
        <p
          className={`alert alert-${status.tone} mt-4`}
          role={status.tone === "danger" ? "alert" : "status"}
        >
          {status.message}
        </p>
      ) : null}
    </div>
  );
}

export function AccountSettings({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const [name, setName] = useState(initialName);
  const [nameStatus, setNameStatus] = useState<Status>(null);
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const saveName = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingName(true);
    setNameStatus(null);

    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = await res.json().catch(() => ({}));
      setNameStatus(
        res.ok
          ? { tone: "success", message: "Name updated." }
          : { tone: "danger", message: payload.error || "Could not save your name." },
      );
    } catch {
      setNameStatus({ tone: "danger", message: "The request failed. Check your connection." });
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ tone: "danger", message: "The two new passwords do not match." });
      return;
    }

    setSavingPassword(true);
    setPasswordStatus(null);

    try {
      const res = await fetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = await res.json().catch(() => ({}));

      if (res.ok) {
        setPasswordStatus({ tone: "success", message: "Password updated." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordStatus({
          tone: "danger",
          message: payload.error || "Could not change your password.",
        });
      }
    } catch {
      setPasswordStatus({ tone: "danger", message: "The request failed. Check your connection." });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="card p-6" aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="font-display text-xl">
          Profile
        </h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Your name is what teammates see on tasks and in the member list.
        </p>

        <form onSubmit={saveName} className="mt-5 space-y-4">
          <div className="field-label">
            <label htmlFor="settings-email">Email</label>
            <input
              id="settings-email"
              type="email"
              value={email}
              readOnly
              disabled
              className="input"
              aria-describedby="settings-email-hint"
            />
            <span id="settings-email-hint" className="text-xs text-[color:var(--muted)]">
              Changing your email address is not supported yet.
            </span>
          </div>

          <div className="field-label">
            <label htmlFor="settings-name">Display name</label>
            <input
              id="settings-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={80}
              className="input"
            />
          </div>

          <button type="submit" disabled={savingName} className="btn btn-primary">
            {savingName ? "Saving…" : "Save name"}
          </button>
        </form>

        <Notice status={nameStatus} />
      </section>

      <section className="card p-6" aria-labelledby="password-heading">
        <h2 id="password-heading" className="font-display text-xl">
          Password
        </h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Your current password is required. Other devices stay signed in — use
          the reset flow instead if you think someone else has access.
        </p>

        <form onSubmit={savePassword} className="mt-5 space-y-4">
          <div className="field-label">
            <label htmlFor="current-password">Current password</label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              className="input"
            />
          </div>

          <div className="field-label">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={12}
              className="input"
              aria-describedby="new-password-hint"
            />
            <span id="new-password-hint" className="text-xs text-[color:var(--muted)]">
              At least 12 characters.
            </span>
          </div>

          <div className="field-label">
            <label htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={12}
              className="input"
            />
          </div>

          <button type="submit" disabled={savingPassword} className="btn btn-primary">
            {savingPassword ? "Updating…" : "Update password"}
          </button>
        </form>

        <Notice status={passwordStatus} />
      </section>
    </div>
  );
}
