"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";

const PendingContext = createContext(false);

export function SubmitButton({ children, className = "btn w-full" }: { children: ReactNode; className?: string }) {
  const inStatefulForm = useContext(PendingContext);
  const { pending: formPending } = useFormStatus();
  const pending = inStatefulForm || formPending;
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "Sparar…" : children}
    </button>
  );
}

/** Formulär som visar fel- och klartmeddelanden från en server action och tömmer sig när det gick bra. */
export function StatefulForm({
  action,
  children,
  className = "flex flex-col gap-3",
  resetOnOk = true,
  quiet = false,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  resetOnOk?: boolean;
  /** Visa inget klartmeddelande. För små formulär på en rad. */
  quiet?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnOk) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    // onSubmit i stället för action: React tömmer annars fälten även när det blev fel.
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      <PendingContext.Provider value={pending}>
        <fieldset disabled={pending} className="contents">
          {children}
        </fieldset>
      </PendingContext.Provider>
      {state?.error && <p className="w-full rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">{state.error}</p>}
      {state?.ok && !quiet && <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent" role="status">{state.ok}</p>}
    </form>
  );
}

/** Hopfällbar ruta för "lägg till"-formulär så att sidorna inte drunknar i fält. */
export function AddPanel({ title, children, open }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="card group" open={open} id={open ? "ny" : undefined}>
      <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
        {title}
        <span className="text-xl leading-none text-accent transition group-open:rotate-45">+</span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
