"use client";

import { X } from "lucide-react";
import { ConfirmAction } from "./ConfirmAction";
import { useI18n } from "./I18nProvider";

/** Ta bort i två steg: första trycket frågar "Ta bort?", andra trycket tar bort. */
export function ConfirmDelete({ action, id, label }: { action: (form: FormData) => Promise<void>; id: string; label: string }) {
  const { t } = useI18n();
  return (
    <ConfirmAction action={action} id={id} label={label} confirm={t("Ta bort?")}>
      <X size={15} />
    </ConfirmAction>
  );
}
