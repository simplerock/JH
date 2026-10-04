import { newCalendarToken } from "@/app/actions";
import { getI18n } from "@/lib/i18n/server";
import { CopyLink } from "./CopyLink";

/** Prenumerationslänken till telefonens kalender, med korta instruktioner. */
export async function CalendarFeed({ token }: { token: string }) {
  const { t } = await getI18n();
  const path = `/api/kalender/${token}.ics`;
  return (
    <details className="card">
      <summary className="cursor-pointer list-none font-semibold">{t("Visa i iPhone- eller Google-kalendern")}</summary>
      <div className="mt-3 space-y-3 text-sm">
        <p className="text-muted">{t("Allt i Home Hub med datum syns i telefonens kalender och uppdateras av sig själv. Ändringar gör ni här.")}</p>
        <CopyLink path={path} />
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li><span className="text-ink">iPhone:</span> {t("tryck på Öppna i kalendern, eller Inställningar, Kalender, Konton, Lägg till konto, Annat, Lägg till prenumererad kalender.")}</li>
          <li><span className="text-ink">Google:</span> {t("calendar.google.com på datorn, Andra kalendrar, plus, Från webbadress.")}</li>
        </ol>
        <form action={newCalendarToken}>
          <button className="text-sm text-warn">{t("Byt länk (den gamla slutar fungera)")}</button>
        </form>
      </div>
    </details>
  );
}
