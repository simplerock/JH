import { expect, test } from "@playwright/test";

// Föräldrarna planerar: plusknappen, resemallen, familjens kalender på Hem, prenumeration och veckans genomgång.
const stamp = Date.now().toString(36);
const joey = { email: `joey.plan.${stamp}@example.com`, password: "hemligt123" };
const kid = { username: `hayd${stamp}`.slice(0, 20), pin: "4444" };
const inFuture = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

test("planera med plusknappen och se det i kalendern", async ({ page, browser, request }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Nytt konto" }).click();
  await page.getByLabel("E-post").fill(joey.email);
  await page.getByLabel("Lösenord").fill(joey.password);
  await page.getByRole("button", { name: "Skapa konto" }).click();
  await page.getByLabel("Familjens namn").fill("Familjen Hiew");
  await page.getByLabel("Ditt namn").first().fill("Joey");
  await page.getByRole("button", { name: "Skapa familj" }).click();
  await expect(page.getByRole("heading", { name: /Joey/ })).toBeVisible();

  await page.goto("/familj");
  await page.getByText("Lägg till barn").click();
  await page.getByLabel("Namn", { exact: true }).first().fill("Hayden");
  await page.getByLabel("Användarnamn").fill(kid.username);
  await page.getByLabel(/PIN/).fill(kid.pin);
  await page.getByRole("button", { name: "Skapa barnkonto" }).click();
  await expect(page.getByText("Hayden kan nu logga in")).toBeVisible();

  // Plusknappen leder till rätt formulär, redan öppet
  await page.goto("/");
  await page.getByRole("link", { name: "Lägg till" }).click();
  await expect(page.getByRole("heading", { name: "Lägg till" })).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/40-ny.png", fullPage: true });
  await page.getByRole("link", { name: /^Resa/ }).click();
  await expect(page.locator("#ny")).toHaveAttribute("open", "");

  // Resa med mallen
  await page.getByLabel("Namn", { exact: true }).fill("Zhangjiajie");
  await page.getByLabel("Från", { exact: true }).fill(inFuture(34));
  await page.getByLabel("Till", { exact: true }).fill(inFuture(42));
  await page.getByLabel("Planerar").selectOption({ label: "Joey" });
  await page.getByRole("button", { name: "Spara" }).click();
  await expect(page.getByRole("heading", { name: "Zhangjiajie" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bocka av Boka flyg och boende" })).toBeVisible();
  await expect(page.getByText("Packa egen väska")).toBeVisible();

  // Händelse den här veckan
  await page.goto("/ny");
  await page.getByRole("link", { name: /^Händelse/ }).click();
  await page.getByLabel("Typ").selectOption({ label: "Händelse" });
  await page.getByLabel("Namn", { exact: true }).fill("Utvecklingssamtal Hayden");
  await page.getByLabel("Från", { exact: true }).fill(inFuture(0));
  await page.getByRole("checkbox", { name: /Lägg till uppgifter inför resan/ }).uncheck();
  await page.getByRole("button", { name: "Spara" }).click();
  await expect(page.getByRole("heading", { name: "Utvecklingssamtal Hayden" })).toBeVisible();

  // Hem: familjens kalender, veckovis med filter
  await page.goto("/");
  await expect(page.getByText("Familjens kalender")).toBeVisible();
  await expect(page.getByRole("link", { name: /Utvecklingssamtal Hayden/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Zhangjiajie/ })).toHaveCount(0);
  await page.getByRole("link", { name: "3 månader" }).click();
  await expect(page.getByRole("link", { name: /^Zhangjiajie/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Boka flyg och boende/ })).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/41-hem-kalender.png", fullPage: true });

  // Prenumeration
  await page.goto("/kalender");
  await page.getByText("Visa i iPhone- eller Google-kalendern").click();
  const url = await page.getByLabel("Kalenderlänk").inputValue();
  expect(url).toMatch(/\/api\/kalender\/[a-f0-9]{36}\.ics$/);
  const ics = await (await request.get(url)).text();
  expect(ics).toContain("BEGIN:VCALENDAR");
  expect(ics).toContain("SUMMARY:Zhangjiajie");
  expect(ics).toContain("SUMMARY:Utvecklingssamtal Hayden");
  expect((await request.get(url.replace(/[a-f0-9]{36}/, "0".repeat(36)))).status()).toBe(404);
  await page.screenshot({ path: "e2e/screenshots/42-kalender.png", fullPage: true });

  // Veckans genomgång
  await page.goto("/vecka");
  await expect(page.getByRole("heading", { name: "Veckans genomgång" })).toBeVisible();
  await expect(page.getByText("Hayden hamnade under ribban")).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/43-vecka.png", fullPage: true });

  // Barnet: ingen plusknapp, ingen genomgång, men packuppgiften
  const k = await (await browser.newContext()).newPage();
  await k.goto("/login");
  await k.getByRole("button", { name: "Barn" }).click();
  await k.getByLabel("Ditt namn").fill(kid.username);
  await k.getByLabel("PIN-kod").fill(kid.pin);
  await k.getByRole("button", { name: "Logga in" }).click();
  await expect(k.getByRole("button", { name: "Ta foto och skicka Packa egen väska" })).toBeVisible();
  await expect(k.getByRole("link", { name: "Lägg till" })).toHaveCount(0);
  await k.goto("/vecka");
  await expect(k).toHaveURL(/\/$/);
});
