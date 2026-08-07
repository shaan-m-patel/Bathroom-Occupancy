import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { StatusProvider } from "@/components/status-provider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/welcome");

  return <StatusProvider>{children}</StatusProvider>;
}
