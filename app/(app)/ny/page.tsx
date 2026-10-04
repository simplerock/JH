import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus, Camera, ChevronRight, Hammer, ListChecks, Plane, Receipt, Target, Wrench } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/Section";
import { aiEnabled } from "@/lib/ai/trip";
import { getI18n } from "@/lib/i18n/server";
import { getSession } from "@/lib/session";

/** Ett ställe för föräldrar att lägga till nytt. Varje val öppnar rätt formulär direkt. */
export default async function NewPage() {
  const [{ isParent }, { t }] = await Promise.all([getSession(), getI18n()]);
  if (!isParent) redirect("/");
  const ai = aiEnabled();

  const groups = [
    {
      title: t("Planera"),
      items: [
        ...(ai ? [{ href: "/ny/foto", icon: Camera, title: t("Fota en lapp eller klistra in ett mejl"), sub: t("Skolbrev, träningsschema. Claude lägger in datumen.") }] : []),
        { href: "/kalender?ny=1#ny", icon: CalendarPlus, title: t("Händelse"), sub: t("Kalas, möte, aktivitet") },
        { href: "/kalender?ny=1#ny", icon: Plane, title: t("Resa"), sub: t("Med färdiga uppgifter inför resan") },
      ],
    },
    {
      title: t("Göra"),
      items: [
        { href: "/rutiner?vem=alla&ny=1#ny", icon: ListChecks, title: t("Syssla"), sub: t("Återkommande eller en gång, med poäng för barnen") },
        { href: "/mal?ny=1#ny", icon: Target, title: t("Mål"), sub: t("Spara till något eller nå ett steg i taget") },
      ],
    },
    {
      title: t("Hemmet"),
      items: [
        { href: "/hemmet?ny=1#ny", icon: Hammer, title: t("Projekt"), sub: t("Renovering med budget och steg") },
        { href: "/hemmet?visa=underhall&ny=1#ny", icon: Wrench, title: t("Underhåll"), sub: t("Något som ska göras med jämna mellanrum") },
        { href: "/budget?ny=1#ny", icon: Receipt, title: t("Utgift"), sub: t("Till månadens budget") },
      ],
    },
  ];

  return (
    <>
      <PageHeader title={t("Lägg till")} />
      {groups.map((g) => (
        <Section key={g.title} title={g.title}>
          {g.items.map(({ href, icon: Icon, title, sub }) => (
            <Link key={title} href={href} className="flex min-h-14 items-center gap-3 py-3">
              <Icon size={20} className="shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{title}</p>
                <p className="text-[13px] text-muted">{sub}</p>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </Link>
          ))}
        </Section>
      ))}
    </>
  );
}
