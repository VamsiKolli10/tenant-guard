import { redirect } from "next/navigation";

import { AccountSettings } from "@/components/account-settings";
import { BackLink } from "@/components/ui";
import { prisma } from "@/server/db";
import { getSessionUserId } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/signin");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  if (!user) {
    redirect("/signin");
  }

  return (
    <main className="page-wash min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-2xl space-y-8">
        <header className="space-y-4">
          <BackLink href="/dashboard">All workspaces</BackLink>
          <div>
            <p className="eyebrow">Account</p>
            <h1 className="font-display text-3xl">Your settings</h1>
          </div>
        </header>

        <AccountSettings
          initialName={user.name ?? ""}
          email={user.email}
        />
      </div>
    </main>
  );
}
