import type { ReactNode } from "react";

/** Rubrik + grupperad lista. Det grundläggande byggblocket på varje sida. */
export function Section({ title, aside, children }: { title?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section>
      {title && (
        <h2 className="section-title">
          {title}
          {aside && <span>{aside}</span>}
        </h2>
      )}
      <div className="group">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-4 text-muted">{children}</p>;
}
