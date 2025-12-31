export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="space-y-2 text-center">
          <p className="font-display text-3xl">Tenant Guard</p>
          <p className="text-sm text-[color:var(--muted)]">
            Secure tenant workspaces, ready for audit.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
