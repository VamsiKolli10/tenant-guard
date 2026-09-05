import { AcceptInvitePanel } from "@/components/accept-invite-panel";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function InviteAcceptPage({ params }: PageProps) {
  const { token } = await params;

  return (
    <div className="page-wash min-h-screen px-4 py-16 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="eyebrow">Tenant Guard</p>
          <h1 className="mt-2 font-display text-3xl">You have been invited</h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Accepting adds your account to the workspace. You need a verified
            email address before you can join.
          </p>
        </div>
        <AcceptInvitePanel token={token} />
      </div>
    </div>
  );
}
