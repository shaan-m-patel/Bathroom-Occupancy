import { ReserveForm } from "@/components/schedule/reserve-form";

export default function ReservePage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 pt-6">
      <header className="px-1">
        <h1 className="text-xl font-semibold tracking-tight">Reserve</h1>
        <p className="text-sm text-muted-foreground">
          Block out bathroom time in advance
        </p>
      </header>
      <ReserveForm />
    </main>
  );
}
