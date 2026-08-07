import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, members } from "@/db";
import { getSession } from "@/lib/auth";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function WelcomePage() {
  const session = await getSession();
  if (session) {
    // Only bounce back if the cookie still points at a real member
    const db = getDb();
    const [me] = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.id, session.memberId));
    if (me) redirect("/");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 p-6">
      <div className="space-y-2 text-center">
        <div className="text-5xl">🛁</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bathroom Status
        </h1>
        <p className="text-muted-foreground">
          Know when the bathroom is free. Reserve your time. No more knocking.
        </p>
      </div>
      <OnboardingForm />
    </main>
  );
}
