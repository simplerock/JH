import { expect, test, type Browser, type Page } from "@playwright/test";

// Barnen väljer lediga sysslor själva, och föräldrarna följer varje barns vecka.
const shot = (page: Page, name: string) => page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
const stamp = Date.now().toString(36);
const joey = { email: `joey.b.${stamp}@example.com`, password: "hemligt123" };
const haylee = { username: `hb${stamp}`.slice(0, 20), pin: "4444" };
const hayden = { username: `db${stamp}`.slice(0, 20), pin: "5555" };
const PHOTO = "e2e/test-foto.png";

test.describe.configure({ mode: "serial" });

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

let dad: Page;

test("Joey lägger upp en ledig syssla och en utdelad", async ({ browser }) => {
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
  for (const [name, kid] of [["Haylee", haylee], ["Hayden", hayden]] as const) {
    await dad.getByLabel("Namn", { exact: true }).first().fill(name);
    await dad.getByLabel("Användarnamn").fill(kid.username);
    await dad.getByLabel(/PIN/).fill(kid.pin);
    await dad.getByRole("button", { name: "Skapa barnkonto" }).click();
    await expect(dad.getByText(`${name} kan nu logga in`)).toBeVisible();
  }

  await dad.goto("/rutiner?vem=alla");
  await dad.getByText("Ny syssla").click();
  const add = async (title: string, who: string, points: string, photo = false) => {
    await dad.getByLabel("Vad ska göras?").fill(title);
    await dad.getByLabel("Hur ofta").selectOption({ label: "Varje dag" });
    await dad.getByLabel("Vem", { exact: true }).selectOption({ label: who });
    await dad.getByLabel("Poäng (barn)").fill(points);
    await dad.getByRole("checkbox", { name: "Kräver foto" }).setChecked(photo);
    await dad.getByRole("button", { name: "Lägg till" }).click();
    await expect(dad.getByText("Tillagd")).toBeVisible();
  };
  await add("Tömma diskmaskinen", "Ledig syssla", "3");
  await add("Bädda sängen", "Haylee", "2");
  await add("Kasta skräpet", "Hayden", "3", true);
});

test("Hayden får veta om fotot inte kommer fram, och kan försöka igen", async ({ browser }) => {
  const kid = await loginChild(browser, hayden);
  // Som när lagringen saknades i Supabase: uppladdningen nekas.
  await kid.route("**/storage/v1/object/bevis/**", (route) => route.fulfill({ status: 400, body: JSON.stringify({ error: "Bucket not found" }) }));
  let chooser = kid.waitForEvent("filechooser");
  await kid.getByRole("button", { name: "Ta foto och skicka Kasta skräpet" }).click();
  await (await chooser).setFiles(PHOTO);
  // Next.js har en egen osynlig role=alert för sidbyten, så rutan letas upp på texten.
  const failed = kid.getByRole("alert").filter({ hasText: "Fotot kom inte fram" });
  await expect(failed).toBeVisible();
  await expect(kid.getByText("Väntar på mamma eller pappa")).toHaveCount(0);

  await kid.unroute("**/storage/v1/object/bevis/**");
  chooser = kid.waitForEvent("filechooser");
  await failed.getByRole("button", { name: "Försök igen" }).click();
  await (await chooser).setFiles(PHOTO);
  await expect(kid.getByText("Väntar på mamma eller pappa")).toBeVisible();
  await expect(failed).toHaveCount(0);
});

test("Haylee väljer den lediga sysslan, Hayden ser att den är tagen", async ({ browser }) => {
  const kid = await loginChild(browser, haylee);
  const free = kid.locator("section", { hasText: "Välj en syssla" });
  await expect(free.getByText("Tömma diskmaskinen")).toBeVisible();
  await free.getByRole("button", { name: "Ta Tömma diskmaskinen" }).click();
  await expect(kid.getByText("Välj en syssla")).toHaveCount(0);
  await expect(kid.getByText("Tömma diskmaskinen")).toBeVisible();

  // Ångrar sig och tar den igen
  await kid.getByRole("button", { name: "Släpp Tömma diskmaskinen" }).click();
  await expect(kid.getByRole("button", { name: "Ta Tömma diskmaskinen" })).toBeVisible();
  await kid.getByRole("button", { name: "Ta Tömma diskmaskinen" }).click();
  await expect(kid.getByRole("button", { name: "Släpp Tömma diskmaskinen" })).toBeVisible();
  // En syssla från pappa går inte att släppa
  await expect(kid.getByRole("button", { name: "Släpp Bädda sängen" })).toHaveCount(0);

  await kid.getByRole("button", { name: "Klar med Bädda sängen" }).click();
  await expect(kid.getByText("Väntar på mamma eller pappa")).toBeVisible();
  await shot(kid, "barn-valt");

  const brother = await loginChild(browser, hayden);
  await expect(brother.getByText("Tömma diskmaskinen")).toHaveCount(0);
  await brother.goto("/rutiner");
  await expect(brother.getByText("Tömma diskmaskinen")).toHaveCount(0);
});

test("Joey följer Haylees vecka och godkänner där", async () => {
  await dad.goto("/poang");
  await dad.getByRole("link", { name: /Haylee/ }).click();
  await expect(dad.getByRole("heading", { name: "Haylee" })).toBeVisible();
  await expect(dad.locator("section", { hasText: "Kvar att göra" }).getByText("Tömma diskmaskinen")).toBeVisible();
  await expect(dad.getByText("Att godkänna")).toBeVisible();
  await dad.getByRole("button", { name: "Godkänn" }).click();
  await expect(dad.locator("section", { hasText: "Klart den här veckan" }).getByText("Bädda sängen")).toBeVisible();
  await expect(dad.getByText("+2 p")).toBeVisible();
  await expect(dad.getByRole("list", { name: "Poäng per dag" }).getByRole("listitem", { name: /: 2 poäng/ })).toHaveCount(1);
  await shot(dad, "barn-vecka");
});
