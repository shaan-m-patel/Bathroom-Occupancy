import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, households, members } from "@/db";
import { getSession } from "@/lib/auth";
import { HouseholdCard } from "@/components/profile/household-card";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { PushToggle } from "@/components/profile/push-toggle";
import { StatsSection } from "@/components/profile/stats-section";

export default async function ProfilePage() {
  const session = (await getSession())!;
  const db = getDb();

  const [me] = await db
    .select({ member: members, household: households })
    .from(members)
    .innerJoin(households, eq(members.householdId, households.id))
    .where(eq(members.id, session.memberId));
  if (!me) redirect("/welcome");

  const householdMembers = await db
    .select()
    .from(members)
    .where(eq(members.householdId, session.householdId));

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 pt-6">
      <header className="animate-fade-up px-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Profile
        </h1>
      </header>

      <ProfileEditor
        initialName={me.member.name}
        initialEmoji={me.member.emoji}
        initialColor={me.member.color}
      />
      <PushToggle />
      <HouseholdCard
        name={me.household.name}
        inviteCode={me.household.inviteCode}
        members={householdMembers.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        }))}
        meId={session.memberId}
      />
      <StatsSection meId={session.memberId} />
    </main>
  );
}
