import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import InvoicesClient from "./InvoicesClient";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string; openInvoiceId?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;

  return (
    <InvoicesClient 
      user={session.user} 
      openInvoiceId={resolvedParams.open || resolvedParams.openInvoiceId} 
    />
  );
}