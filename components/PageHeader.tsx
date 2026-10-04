import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({ title, subtitle, back }: { title: string; subtitle?: string; back?: { href: string; label: string } }) {
  return (
    <header>
      {back && (
        <Link href={back.href} className="mb-1 inline-flex items-center gap-0.5 text-sm text-muted">
          <ChevronLeft size={16} /> {back.label}
        </Link>
      )}
      <h1 className="text-[28px] font-bold leading-tight tracking-tight text-balance">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm capitalize text-muted">{subtitle}</p>}
    </header>
  );
}
