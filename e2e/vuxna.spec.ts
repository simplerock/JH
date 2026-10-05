import { expect, test, type Browser, type Page } from "@playwright/test";

// Vuxenverktyg: ljust och mörkt läge, redigerbar budget och extra poäng.
const shot = (page: Page, name: string) => page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
const stamp = Date.now().toString(36);
const joey = { email: `joey.v.${stamp}@example.com`, password: "hemligt123" };
const haylee = { username: `hv${stamp}`.slice(0, 20), pin: "3333" };

test.describe.configure({ mode: "serial" });

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

let dad: Page;

test("Joey skapar familjen och väljer mörkt läge", async ({ browser }) => {
  dad = await (await browser.newContext({ colorScheme: "light" })).newPage();
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

  // Följer telefonen från början, sen mörkt, och valet sitter kvar efter omladdning.
  await dad.goto("/familj");
  await expect(dad.getByRole("radio", { name: "Auto" })).toHaveAttribute("aria-checked", "true");
  const bg = () => dad.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await bg()).toBe("rgb(246, 244, 239)");
  await dad.getByRole("radio", { name: "Mörkt" }).click();
  await expect(dad.getByRole("radio", { name: "Mörkt" })).toHaveAttribute("aria-checked", "true");
  await dad.reload();
  await expect(dad.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await bg()).toBe("rgb(20, 22, 21)");
  await shot(dad, "vuxna-morkt");
  await dad.getByRole("radio", { name: "Ljust" }).click();
  await expect(dad.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await bg()).toBe("rgb(246, 244, 239)");
});

test("Joey ändrar budgeten", async () => {
  await dad.goto("/budget");
  await dad.getByText("Ny kategori").click();
  await dad.getByLabel("Namn", { exact: true }).fill("Lördagsmiddag");
  await dad.getByLabel("Per månad (kr)").fill("4800");
  await dad.getByRole("button", { name: "Lägg till" }).click();
  await expect(dad.getByText("Kategorin är tillagd")).toBeVisible();

  await dad.getByText("Ny utgift").click();
  await dad.getByLabel("Belopp (kr)").fill("1150");
  await dad.getByLabel("Vad", { exact: true }).fill("Restaurang");
  await dad.getByRole("button", { name: "Spara" }).click();
  await expect(dad.getByText("Utgiften är sparad")).toBeVisible();
  await expect(dad.getByText("3 650 kr kvar").first()).toBeVisible();

  // Höj budgeten och byt namn
  await dad.reload();
  await dad.locator("summary", { hasText: "Lördagsmiddag" }).filter({ hasText: "kvar" }).click();
  const cat = dad.locator("details", { has: dad.getByRole("textbox", { name: "Ändra namn" }) });
  await cat.getByRole("textbox", { name: "Ändra budget per månad" }).fill("6000");
  await cat.getByRole("textbox", { name: "Ändra namn" }).fill("Helgmiddagar");
  await cat.getByRole("button", { name: "Spara" }).click();
  await expect(cat.getByText("Sparat")).toBeVisible();
  await dad.reload();
  await expect(dad.getByText("4 850 kr kvar").first()).toBeVisible();
  await expect(dad.getByText("Helgmiddagar").first()).toBeVisible();

  // Rätta en utgift
  await dad.locator("summary", { hasText: "Restaurang" }).click();
  const tx = dad.locator("details", { has: dad.getByRole("textbox", { name: "Ändra belopp" }) });
  await tx.getByRole("textbox", { name: "Ändra belopp" }).fill("1200");
  await tx.getByRole("button", { name: "Spara" }).click();
  await expect(tx.getByText("Sparat")).toBeVisible();
  await dad.reload();
  await expect(dad.getByText("4 800 kr kvar").first()).toBeVisible();
  await shot(dad, "vuxna-budget");
});

test("Joey ger extra poäng och Haylee ser dem", async ({ browser }) => {
  await dad.goto("/poang");
  await expect(dad.getByText("Väljer restaurang till lördagsmiddagen, max 1200 kr")).toBeVisible();
  await dad.locator("summary", { hasText: "Ge extra poäng" }).click();
  await dad.getByLabel("Poäng", { exact: true }).fill("8");
  await dad.getByLabel("Varför").fill("Dukade utan att bli tillfrågad");
  await dad.getByRole("button", { name: "Ge poäng" }).click();
  await expect(dad.getByText("+8 p").first()).toBeVisible();
  await expect(dad.getByText("Dukade utan att bli tillfrågad")).toBeVisible();

  await dad.getByLabel("Poäng", { exact: true }).fill("0");
  await dad.getByLabel("Varför").fill("Inget");
  await dad.getByRole("button", { name: "Ge poäng" }).click();
  await expect(dad.locator("p[role=alert]")).toContainText("mellan 1 och 100");

  const kid = await loginChild(browser);
  await expect(kid.getByText("8", { exact: true })).toBeVisible();
  await expect(kid.getByText(/8 extra/)).toBeVisible();
  await kid.goto("/poang");
  await expect(kid.getByText("Dukade utan att bli tillfrågad")).toBeVisible();
  await expect(kid.locator("summary", { hasText: "Ge extra poäng" })).toHaveCount(0);
  await expect(kid.getByRole("button", { name: "Ta bort extra poäng" })).toHaveCount(0);
  await shot(kid, "vuxna-barn-extra");

  // Joey ångrar, då försvinner poängen
  await dad.goto("/poang");
  // Två steg: första trycket frågar, andra tar bort. Ett dubbeltryck ska inte ta bort fel rad.
  await dad.getByRole("button", { name: "Ta bort extra poäng" }).click();
  await expect(dad.getByText("Dukade utan att bli tillfrågad")).toBeVisible();
  await dad.getByRole("button", { name: "Bekräfta: Ta bort extra poäng" }).click();
  await expect(dad.getByText("Inga extra poäng den här veckan.")).toBeVisible();
});

test("Joey byter till engelska och tillbaka", async ({ browser }) => {
  await dad.goto("/familj");
  await dad.getByRole("radio", { name: "English" }).click();
  await expect(dad.locator("html")).toHaveAttribute("lang", "en");
  await expect(dad.getByRole("heading", { name: "Appearance" })).toBeVisible();
  await expect(dad.getByRole("link", { name: "Home" })).toBeVisible();

  await dad.goto("/poang");
  await expect(dad.getByRole("heading", { name: "Points and rewards" })).toBeVisible();
  await expect(dad.getByText("Picks the restaurant for Saturday dinner, max 1200 kr")).toBeVisible();
  await dad.goto("/rutiner?vem=alla");
  await dad.locator("summary", { hasText: "New chore" }).click();
  await dad.getByLabel("What needs doing?").fill("Water the plants");
  await dad.getByLabel("How often").selectOption({ label: "Every week" });
  await dad.getByRole("button", { name: "Add" }).click();
  await expect(dad.getByText("Added")).toBeVisible();
  await shot(dad, "vuxna-engelska");

  await dad.goto("/familj");
  await dad.getByRole("radio", { name: "Svenska" }).click();
  await expect(dad.locator("html")).toHaveAttribute("lang", "sv");
  await expect(dad.getByRole("heading", { name: "Utseende" })).toBeVisible();

  // Inloggningssidan har också språkval, så att barnen kan välja innan de loggar in.
  const guest = await (await browser.newContext()).newPage();
  await guest.goto("/login");
  await guest.getByRole("radio", { name: "English" }).click();
  await expect(guest.getByRole("button", { name: "Child" })).toBeVisible();
  await expect(guest.getByLabel("Email")).toBeVisible();
});
