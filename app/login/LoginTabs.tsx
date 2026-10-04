"use client";

import { useState } from "react";
import { childSignIn, signIn, signUp } from "@/app/actions";
import { StatefulForm, SubmitButton } from "@/components/Forms";

type Mode = "parent" | "child" | "signup";

export function LoginTabs() {
  const [mode, setMode] = useState<Mode>("parent");
  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${mode === m ? "bg-card text-ink shadow-sm" : "text-muted"}`}
      aria-pressed={mode === m}
    >
      {label}
    </button>
  );

  return (
    <div className="card">
      <div className="mb-5 flex gap-1 rounded-xl bg-track p-1">
        {tab("parent", "Vuxen")}
        {tab("child", "Barn")}
        {tab("signup", "Nytt konto")}
      </div>

      {mode === "parent" && (
        <StatefulForm action={signIn} key="parent" resetOnOk={false}>
          <div>
            <label className="label" htmlFor="email">E-post</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Lösenord</label>
            <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <SubmitButton>Logga in</SubmitButton>
        </StatefulForm>
      )}

      {mode === "child" && (
        <StatefulForm action={childSignIn} key="child" resetOnOk={false}>
          <div>
            <label className="label" htmlFor="username">Ditt namn</label>
            <input className="input" id="username" name="username" autoCapitalize="none" autoComplete="username" required />
          </div>
          <div>
            <label className="label" htmlFor="pin">PIN-kod</label>
            <input
              className="input text-center text-2xl tracking-[0.5em]"
              id="pin"
              name="pin"
              type="password"
              inputMode="numeric"
              pattern="\d{4,8}"
              autoComplete="current-password"
              required
            />
          </div>
          <SubmitButton>Logga in</SubmitButton>
        </StatefulForm>
      )}

      {mode === "signup" && (
        <StatefulForm action={signUp} key="signup" resetOnOk={false}>
          <p className="text-sm text-muted">För vuxna. Barnkonton skapar du sen inne i appen.</p>
          <div>
            <label className="label" htmlFor="su-email">E-post</label>
            <input className="input" id="su-email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <label className="label" htmlFor="su-password">Lösenord</label>
            <input className="input" id="su-password" name="password" type="password" minLength={6} autoComplete="new-password" required />
          </div>
          <SubmitButton>Skapa konto</SubmitButton>
        </StatefulForm>
      )}
    </div>
  );
}
