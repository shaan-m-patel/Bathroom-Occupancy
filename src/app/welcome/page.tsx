import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, members } from "@/db";
import { getSession } from "@/lib/auth";
import { OnboardingForm } from "@/components/onboarding-form";
import { GreekKeyDivider, IvyColumn } from "@/components/decor";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-7 p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="animate-fade-up space-y-4 text-center">
        <div className="flex items-end justify-center gap-5">
          <IvyColumn className="h-36 w-10 opacity-80" />
          <div className="pb-2">
            <div className="text-4xl">🛁</div>
            <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight">
              Bathroom Status
            </h1>
          </div>
          <IvyColumn flip className="h-36 w-10 opacity-80" />
        </div>
        <GreekKeyDivider className="mx-auto max-w-56" />
        <p className="text-muted-foreground">
          Know when the bath is free. Reserve your hour. No more knocking on
          marble doors.
        </p>
      </div>

      <div className="animate-fade-up [animation-delay:120ms]">
        <OnboardingForm />
      </div>
    </main>
  );
}
