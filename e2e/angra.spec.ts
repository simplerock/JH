import { expect, test, type Browser, type Page } from "@playwright/test";

// Ångra och återställ: barnet ångrar ett felklick, föräldern återställer, och "Gör om" syns högst upp på barnets Hem.
const shot = (page: Page, name: string) => page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
const stamp = Date.now().toString(36);
const joey = { email: `joey.a.${stamp}@example.com`, password: "hemligt123" };
const haylee = { username: `ha${stamp}`.slice(0, 20), pin: "6666" };

test.describe.configure({ mode: "serial" });

let dad: Page;
let kid: Page;

async function loginChild(browser: Browser) {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await page.getByRole("button", { name: "Barn" }).click();
  await page.getByLabel("Ditt namn").fill(haylee.username);
  await page.getByLabel("PIN-kod").fill(haylee.pin);
  await page.getByRole("button", { name: "Logga in" }).click();
  await expect(page.getByText("poäng den här veckan")).toBeVisible();
  return page;
}

const points = (page: Page) => page.locator("span.text-\\[44px\\]");
const card = (page: Page, title: string) => page.locator("div.py-3\\.5", { hasText: title });

test("Joey lägger upp Haylees sysslor", async ({ browser }) => {
  dad = await (await browser.newContext()).newPage();
  await dad.goto("/login");
  await dad.getByRole("button", { name: "Nytt konto" }).click();
  await dad.getByLabel("E-post").fill(joey.email);
  await dad.getByLabel("Lösenord").fill(joey.password);
  await dad.getByRole("button", { name: "Skapa konto" }).click();
  await dad.getByLabel("Familjens namn").fill("Familjen Hiew");
  await dad.getByLabel("Ditt namn").first().fill("Joey");
  await dad.getByRole("button", { name: "Skapa familj" }).click();
  await expect(dad.getByRole("heading", { name: /Joey/ })).toBeVisible();

  await dad.goto("/familj");
  await dad.getByText("Lägg till barn").click();
  await dad.getByLabel("Namn", { exact: true }).first().fill("Haylee");
  await dad.getByLabel("Användarnamn").fill(haylee.username);
  await dad.getByLabel(/PIN/).fill(haylee.pin);
  await dad.getByRole("button", { name: "Skapa barnkonto" }).click();
  await expect(dad.getByText("Haylee kan nu logga in")).toBeVisible();

  await dad.goto("/rutiner?vem=alla");
  await dad.getByText("Ny syssla").click();
  for (const [title, pts] of [["Städa rummet", "8"], ["Laga middag", "12"], ["Bädda sängen", "2"]]) {
    await dad.getByLabel("Vad ska göras?").fill(title);
    await dad.getByLabel("Hur ofta").selectOption({ label: "Varje dag" });
    await dad.getByLabel("Vem", { exact: true }).selectOption({ label: "Haylee" });
    await dad.getByLabel("Poäng (barn)").fill(pts);
    await dad.getByRole("button", { name: "Lägg till" }).click();
    await expect(dad.getByText("Tillagd")).toBeVisible();
  }
});

test("Haylee trycker fel och ångrar", async ({ browser }) => {
  kid = await loginChild(browser);
  await kid.getByRole("button", { name: "Klar med Städa rummet" }).click();
  await expect(kid.getByText("Väntar på mamma eller pappa")).toBeVisible();
  await expect(kid.getByText("8 p väntar på godkännande")).toBeVisible();

  await kid.getByRole("button", { name: "Ångra Städa rummet" }).click();
  await expect(kid.getByRole("button", { name: "Klar med Städa rummet" })).toBeVisible();
  await expect(kid.getByText("Väntar på mamma eller pappa")).toHaveCount(0);
  await expect(kid.getByText("väntar på godkännande")).toHaveCount(0);

  // Nu på riktigt, alla tre
  for (const title of ["Städa rummet", "Laga middag", "Bädda sängen"]) {
    await kid.getByRole("button", { name: `Klar med ${title}` }).click();
    await expect(kid.getByRole("button", { name: `Ångra ${title}` })).toBeVisible();
  }
  await expect(kid.getByText("22 p väntar på godkännande")).toBeVisible();
});

test("Joey godkänner, skickar tillbaka och återställer", async () => {
  await dad.goto("/");
  await expect(dad.getByRole("link", { name: /3 att godkänna/ })).toBeVisible();

  await card(dad, "Laga middag").getByRole("button", { name: "Godkänn" }).click();
  await expect(card(dad, "Laga middag")).toHaveCount(0);

  const room = card(dad, "Städa rummet");
  await room.getByText("Gör om").click();
  await room.getByLabel("Vad saknas?").fill("Dammsug under sängen");
  await room.getByRole("button", { name: "Skicka" }).click();
  await expect(room).toHaveCount(0);

  // Haylee råkade trycka på sängen: Joey återställer, i två steg
  const bed = card(dad, "Bädda sängen");
  await bed.getByRole("button", { name: "Återställ Bädda sängen" }).click();
  await expect(bed).toBeVisible();
  await bed.getByRole("button", { name: "Bekräfta: Återställ Bädda sängen" }).click();
  await expect(bed).toHaveCount(0);
  await expect(dad.getByText("Att godkänna")).toHaveCount(0);
});

test("Haylee ser direkt på Hem vad som ska göras om", async () => {
  await kid.reload();
  const redo = kid.locator("section", { hasText: "Ska göras om" });
  await expect(redo).toBeVisible();
  await expect(redo.getByText("Städa rummet")).toBeVisible();
  await expect(redo.getByText("Dammsug under sängen")).toBeVisible();
  await expect(kid.getByRole("link", { name: /1 att göra om/ })).toBeVisible();
  // Sektionen ligger före allt annat utom poängkortet
  const order = await kid.locator("main > *").evaluateAll((els) => els.map((e) => e.textContent ?? ""));
  expect(order.findIndex((x) => x.includes("Ska göras om"))).toBeLessThan(order.findIndex((x) => x.includes("Familjens kalender")));
  // Sängen är ogjord igen, middagen gav poäng
  await expect(kid.getByRole("button", { name: "Klar med Bädda sängen" })).toBeVisible();
  await expect(points(kid)).toHaveText("12");
  await shot(kid, "angra-gor-om");
});

test("Joey godkänner ändå och återställer en godkänd syssla", async () => {
  await dad.goto("/poang");
  await dad.getByRole("link", { name: /Haylee/ }).click();
  const redo = dad.locator("section", { hasText: "Ska göras om" });
  await expect(redo.getByText("Städa rummet")).toBeVisible();
  await redo.getByRole("button", { name: "Godkänn Städa rummet" }).click();
  await expect(dad.locator("section", { hasText: "Ska göras om" })).toHaveCount(0);

  const done = dad.locator("section", { hasText: "Klart den här veckan" });
  await expect(done.getByText("Städa rummet")).toBeVisible();
  await expect(points(dad)).toHaveText("20");

  // Middagen godkändes av misstag: återställ, i två steg
  await done.getByRole("button", { name: "Återställ Laga middag" }).click();
  await done.getByRole("button", { name: "Bekräfta: Återställ Laga middag" }).click();
  await expect(done.getByText("Laga middag")).toHaveCount(0);
  await expect(points(dad)).toHaveText("8");
  await shot(dad, "angra-barnsida");

  await kid.reload();
  await expect(kid.locator("section", { hasText: "Ska göras om" })).toHaveCount(0);
  await expect(kid.getByRole("link", { name: /att göra om/ })).toHaveCount(0);
  await expect(points(kid)).toHaveText("8");
  await expect(kid.getByRole("button", { name: "Klar med Laga middag" })).toBeVisible();
});
