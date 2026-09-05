import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page-wash min-h-screen px-4 py-12 sm:px-6">
      <main className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="space-y-2 text-center">
          <Link href="/" className="font-display text-3xl">
            Tenant Guard
          </Link>
          <p className="text-sm text-[color:var(--muted)]">
            Secure tenant workspaces, ready for audit.
          </p>
        </div>
        {children}
      </main>
    </div>
  );
}
