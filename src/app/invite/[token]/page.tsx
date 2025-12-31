import { AcceptInvitePanel } from "@/components/accept-invite-panel";

type PageProps = {
  params: { token: string };
};

export default function InviteAcceptPage({ params }: PageProps) {
  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto w-full max-w-md">
        <AcceptInvitePanel token={params.token} />
      </div>
    </div>
  );
}
