import { expect, test, type Browser, type Page } from "@playwright/test";

// Familjen Hiew: Joey och Jaynie godkänner, Haylee och Hayden samlar poäng med fotobevis.
const shot = (page: Page, name: string) => page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
const stamp = Date.now().toString(36);
const joey = { email: `joey.${stamp}@example.com`, password: "hemligt123" };
const jaynie = { email: `jaynie.${stamp}@example.com`, password: "hemligt123" };
const haylee = { username: `haylee${stamp}`.slice(0, 20), pin: "1111" };
const hayden = { username: `hayden${stamp}`.slice(0, 20), pin: "2222" };
const PHOTO = "e2e/test-foto.png";

test.describe.configure({ mode: "serial" });

async function signUp(page: Page, who: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Nytt konto" }).click();
  await page.getByLabel("E-post").fill(who.email);
  await page.getByLabel("Lösenord").fill(who.password);
  await page.getByRole("button", { name: "Skapa konto" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
}

async function loginParent(browser: Browser, who: { email: string; password: string }) {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await page.getByLabel("E-post").fill(who.email);
  await page.getByLabel("Lösenord").fill(who.password);
  await page.getByRole("button", { name: "Logga in" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  return page;
}

async function loginChild(browser: Browser, who: { username: string; pin: string }) {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await page.getByRole("button", { name: "Barn" }).click();
  await page.getByLabel("Ditt namn").fill(who.username);
  await page.getByLabel("PIN-kod").fill(who.pin);
  await page.getByRole("button", { name: "Logga in" }).click();
  await expect(page.getByText("poäng den här veckan")).toBeVisible();
  return page;
}

test("Joey och Jaynie sätter upp familjen", async ({ page, browser }) => {
  await signUp(page, joey);
  await page.getByLabel("Familjens namn").fill("Familjen Hiew");
  await page.getByLabel("Ditt namn").first().fill("Joey");
  await page.getByRole("button", { name: "Skapa familj" }).click();
  await expect(page.getByRole("heading", { name: /Joey/ })).toBeVisible();

  await page.goto("/familj");
  const code = (await page.locator("code").innerText()).trim();
  await page.getByText("Lägg till barn").click();
  for (const [name, kid] of [["Haylee", haylee], ["Hayden", hayden]] as const) {
    await page.getByLabel("Namn", { exact: true }).first().fill(name);
    await page.getByLabel("Användarnamn").fill(kid.username);
    await page.getByLabel(/PIN/).fill(kid.pin);
    await page.getByRole("button", { name: "Skapa barnkonto" }).click();
    await expect(page.getByText(`${name} kan nu logga in`)).toBeVisible();
  }

  // Jaynie går med via koden
  const j = await (await browser.newContext()).newPage();
  await signUp(j, jaynie);
  await j.getByLabel("Inbjudningskod").fill(code);
  await j.getByLabel("Ditt namn").nth(1).fill("Jaynie");
  await j.getByRole("button", { name: "Gå med" }).click();
  await expect(j.getByRole("heading", { name: /Jaynie/ })).toBeVisible();

  // Sysslor med poäng och foto
  await page.goto("/rutiner?vem=alla");
  await page.getByText("Ny syssla").click();
  const add = async (title: string, who: string, points: string, photo: boolean, recurrence = "Varje dag") => {
    await page.getByLabel("Vad ska göras?").fill(title);
    await page.getByLabel("Hur ofta").selectOption({ label: recurrence });
    await page.getByLabel("Vem", { exact: true }).selectOption({ label: who });
    await page.getByLabel("Poäng (barn)").fill(points);
    await page.getByRole("checkbox", { name: "Kräver foto" }).setChecked(photo);
    await page.getByRole("button", { name: "Lägg till" }).click();
    await expect(page.getByText("Tillagd")).toBeVisible();
  };
  await add("Bädda sängen", "Hayden", "2", true);
  await add("Läsa 20 minuter", "Hayden", "3", false);
  await add("Städa rummet", "Haylee", "8", true, "Varje vecka");
  await add("Duka av", "Haylee", "2", false);
  await expect(page.getByRole("button", { name: "Bocka av Bädda sängen" })).toBeVisible();

  // Nivåerna finns från start
  await page.goto("/poang");
  await expect(page.getByText("Guld · 50+ p")).toBeVisible();
  await expect(page.getByText("Under ribban · under 20 p")).toBeVisible();
});

test("Hayden fotar, Joey säger gör om, Jaynie godkänner", async ({ browser }) => {
  const kid = await loginChild(browser, hayden);
  await expect(kid.locator("span.text-\\[44px\\]")).toHaveText("0");

  // Foto krävs: kameran öppnas
  const chooser = kid.waitForEvent("filechooser");
  await kid.getByRole("button", { name: "Ta foto och skicka Bädda sängen" }).click();
  await (await chooser).setFiles(PHOTO);
  await expect(kid.getByText("Väntar på mamma eller pappa")).toBeVisible();
  await expect(kid.getByText("2 p väntar på godkännande")).toBeVisible();

  // Utan foto
  await kid.getByRole("button", { name: "Klar med Läsa 20 minuter" }).click();
  await expect(kid.getByText("5 p väntar på godkännande")).toBeVisible();
  await shot(kid, "20-hayden-skickat");

  // Joey ser fotot och skickar tillbaka sängen
  const dad = await loginParent(browser, joey);
  await expect(dad.getByRole("link", { name: /2 att godkänna/ })).toBeVisible();
  const bed = dad.locator("div.py-3\\.5", { hasText: "Bädda sängen" });
  await expect(bed.getByRole("img", { name: "Foto: Bädda sängen" })).toBeVisible();
  await shot(dad, "21-joey-godkanna");
  await bed.getByText("Gör om").click();
  await bed.getByLabel("Vad saknas?").fill("Täcket ligger på golvet");
  await bed.getByRole("button", { name: "Skicka" }).click();
  await expect(bed).toHaveCount(0);

  // Hayden ser kommentaren och skickar igen
  await kid.reload();
  await expect(kid.getByText("Täcket ligger på golvet")).toBeVisible();
  await expect(kid.getByText("Gör om", { exact: true })).toBeVisible();
  const again = kid.waitForEvent("filechooser");
  await kid.getByRole("button", { name: "Ta foto och skicka Bädda sängen" }).click();
  await (await again).setFiles(PHOTO);
  await expect(kid.getByText("5 p väntar på godkännande")).toBeVisible();

  // Jaynie godkänner båda
  const mom = await loginParent(browser, jaynie);
  for (const title of ["Bädda sängen", "Läsa 20 minuter"]) {
    await mom.locator("div.py-3\\.5", { hasText: title }).getByRole("button", { name: "Godkänn" }).click();
    await expect(mom.locator("div.py-3\\.5", { hasText: title })).toHaveCount(0);
  }
  await expect(mom.getByText("Att godkänna")).toHaveCount(0);
  await expect(mom.getByText("5 p · Under ribban")).toBeVisible();

  await kid.reload();
  await expect(kid.locator("span.text-\\[44px\\]")).toHaveText("5");
  await expect(kid.getByText("15 poäng till Brons")).toBeVisible();
  await expect(kid.getByText("Allt klart. Snyggt.")).toBeVisible();
  // Barnet kan inte ångra något som är godkänt
  await kid.getByText("Visa klara (2)").click();
  await expect(kid.getByRole("button", { name: "Ångra Bädda sängen" })).toBeDisabled();
  await shot(kid, "22-hayden-poang");

  // Haylee ser inte Haydens sysslor som sina, och inte budgeten
  const sis = await loginChild(browser, haylee);
  await expect(sis.getByRole("button", { name: "Ta foto och skicka Städa rummet" })).toBeVisible();
  await expect(sis.getByText("Bädda sängen")).toHaveCount(0);
  await sis.goto("/poang");
  await expect(sis.getByText("Så funkar det")).toBeVisible();
  await expect(sis.getByText("Ny nivå")).toHaveCount(0);

  // Joey höjer ribban för Guld
  await dad.goto("/poang");
  await expect(dad.getByText("5 p · Under ribban")).toBeVisible();
  await dad.getByText("Guld · 50+ p").click();
  await dad.getByLabel("Från poäng").first().fill("60");
  await dad.getByRole("button", { name: "Spara" }).first().click();
  await expect(dad.getByText("Guld · 60+ p")).toBeVisible();
  await shot(dad, "23-poang-foralder");
});
