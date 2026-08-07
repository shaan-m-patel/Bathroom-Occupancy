import { ReserveForm } from "@/components/schedule/reserve-form";

export default function ReservePage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 pt-6">
      <header className="animate-fade-up px-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Reserve
        </h1>
        <p className="text-sm text-muted-foreground">
          Claim your hour in the bath house
        </p>
      </header>
      <div className="animate-fade-up [animation-delay:80ms]">
        <ReserveForm />
      </div>
    </main>
  );
}
