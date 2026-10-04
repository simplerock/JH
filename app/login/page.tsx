import Image from "next/image";
import { LoginTabs } from "./LoginTabs";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <Image src="/icon.svg" alt="" width={64} height={64} className="mx-auto mb-4 rounded-2xl" priority />
        <h1 className="text-3xl font-bold tracking-tight">Home Hub</h1>
        <p className="mt-1 text-muted">Rutiner, mål och planer på ett ställe.</p>
      </div>
      <LoginTabs />
    </main>
  );
}
