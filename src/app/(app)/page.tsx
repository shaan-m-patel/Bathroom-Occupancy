import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, households, members } from "@/db";
import { getSession } from "@/lib/auth";
import { NotificationsFeed } from "@/components/home/notifications-feed";
import { StatusCard } from "@/components/home/status-card";
import { TodayReservations } from "@/components/home/today-reservations";
import { GreekKeyDivider } from "@/components/decor";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function HomePage() {
  const session = (await getSession())!;
  const db = getDb();

  const [me] = await db
    .select({ member: members, household: households })
    .from(members)
    .innerJoin(households, eq(members.householdId, households.id))
    .where(eq(members.id, session.memberId));

  // Stale cookie (member/household deleted) — welcome page will re-onboard
  if (!me) redirect("/welcome");

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 pt-6">
      <header className="animate-fade-up space-y-2 px-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {me.household.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Hi {me.member.name} {me.member.emoji}
            </p>
          </div>
          <ThemeToggle />
        </div>
        <GreekKeyDivider />
      </header>

      <div className="animate-fade-up [animation-delay:80ms]">
        <StatusCard />
      </div>
      <div className="animate-fade-up [animation-delay:160ms]">
        <TodayReservations />
      </div>
      <div className="animate-fade-up [animation-delay:240ms]">
        <NotificationsFeed />
      </div>
    </main>
  );
}
