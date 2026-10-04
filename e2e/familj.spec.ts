import { expect, test, type Page } from "@playwright/test";

const shot = (page: Page, name: string) => page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
const stamp = Date.now().toString(36);
const parent = { email: `anna.${stamp}@example.com`, password: "hemligt123" };
const child = { username: `ella${stamp}`.slice(0, 20), pin: "1234" };

function inFuture(days: number) {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

test.describe.configure({ mode: "serial" });

test("förälder sätter upp familjen", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await shot(page, "01-login");

  await page.getByRole("button", { name: "Nytt konto" }).click();
  await page.getByLabel("E-post").fill(parent.email);
  await page.getByLabel("Lösenord").fill(parent.password);
  await page.getByRole("button", { name: "Skapa konto" }).click();

  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Familjens namn").fill("Familjen Hiew");
  await page.getByLabel("Ditt namn").first().fill("Anna");
  await page.getByRole("button", { name: "Skapa familj" }).click();
  await expect(page.getByRole("heading", { name: /Anna/ })).toBeVisible();

  // Barnkonto
  await page.goto("/familj");
  await page.getByText("Lägg till barn").click();
  await page.getByLabel("Namn", { exact: true }).first().fill("Ella");
  await page.getByLabel("Användarnamn").fill(child.username);
  await page.getByLabel(/PIN/).fill(child.pin);
  await page.getByRole("button", { name: "Skapa barnkonto" }).click();
  await expect(page.getByText(`Ella kan nu logga in med ${child.username}`)).toBeVisible();
  await expect(page.getByText(`Barn · loggar in som ${child.username}`)).toBeVisible();

  // Mål: belopp
  await page.goto("/mal");
  await page.getByText("Nytt mål").click();
  await page.getByLabel("Vad vill ni uppnå?").fill("Semesterkassa Italien");
  await page.getByLabel("Kategori", { exact: true }).selectOption("Semester");
  await page.getByLabel("Deadline").fill(inFuture(240));
  await page.getByLabel("Mål", { exact: true }).fill("30 000");
  await page.getByLabel("Har nu", { exact: true }).fill("6000");
  await page.locator("#owner").selectOption({ label: "Anna" });
  await page.getByRole("button", { name: "Skapa mål" }).click();
  const kassa = page.locator("article", { hasText: "Semesterkassa Italien" });
  await expect(kassa.getByText("6 000 av 30 000 kr")).toBeVisible();
  await kassa.getByLabel("Belopp att lägga till").fill("3000");
  await kassa.getByRole("button", { name: "Lägg till" }).click();
  await expect(kassa.getByText("9 000 av 30 000 kr")).toBeVisible();
  await expect(kassa.getByText("30%")).toBeVisible();

  // Mål: uppgifter
  await page.getByLabel("Vad vill ni uppnå?").fill("Fixa trädgården");
  await page.getByLabel("Kategori", { exact: true }).selectOption("Hem");
  await page.getByText("Uppgifter", { exact: true }).click();
  await page.getByRole("button", { name: "Skapa mål" }).click();
  await expect(page.locator("article", { hasText: "Fixa trädgården" }).getByText("Inga steg än")).toBeVisible();

  // Sysslor
  await page.goto("/rutiner?vem=alla");
  await page.getByText("Ny syssla").click();
  const add = async (title: string, recurrence: string, area: string, who: string, goal?: string) => {
    await page.getByLabel("Vad ska göras?").fill(title);
    await page.getByLabel("Hur ofta").selectOption({ label: recurrence });
    await page.getByLabel("Rum", { exact: true }).fill(area);
    await page.getByLabel("Vem", { exact: true }).selectOption({ label: who });
    await page.getByLabel("Steg i mål").selectOption({ label: goal ?? "Inget" });
    await page.getByRole("button", { name: "Lägg till" }).click();
    await expect(page.getByText("Tillagd")).toBeVisible();
    await expect(page.getByRole("button", { name: `Bocka av ${title}` })).toBeVisible();
  };
  await add("Diska", "Varje dag", "Kök", "Anna");
  await add("Dammsuga", "Varje vecka", "Vardagsrum", "Ella");
  await add("Städa badrummet", "Varje vecka", "Badrum", "Anna");
  await add("Byta lakan", "Varje vecka", "Sovrum", "Ledig syssla");
  await add("Rensa ogräs", "En gång", "Ute", "Ledig syssla", "Fixa trädgården");
  await add("Klippa häcken", "En gång", "Ute", "Anna", "Fixa trädgården");

  await page.getByRole("button", { name: "Bocka av Diska" }).click();
  await expect(page.getByRole("button", { name: "Ångra Diska" })).toBeVisible();
  await page.getByRole("button", { name: "Bocka av Rensa ogräs" }).click();
  await expect(page.getByRole("button", { name: "Ångra Rensa ogräs" })).toBeVisible();
  await shot(page, "04-rutiner");

  await page.goto("/mal");
  await expect(page.locator("article", { hasText: "Fixa trädgården" }).getByText("1 av 2 steg")).toBeVisible();
  await shot(page, "03-mal");

  // Hemmet: projekt
  await page.goto("/hemmet");
  await page.getByText("Nytt projekt").click();
  await page.getByLabel("Vad?", { exact: true }).fill("Nytt badrum");
  await page.getByLabel("Budget (kr)").fill("180000");
  await page.getByLabel("Status", { exact: true }).selectOption({ label: "Pågår" });
  await page.locator("#owner").selectOption({ label: "Anna" });
  await page.getByRole("button", { name: "Skapa projekt" }).click();
  await expect(page.getByRole("heading", { name: "Nytt badrum" })).toBeVisible();
  const badrum = page.locator("section", { has: page.getByRole("heading", { name: "Nytt badrum" }) });
  await badrum.getByText("Hantera").click();
  for (const step of ["Riva kakel", "Tätskikt", "Kakla"]) {
    await badrum.getByLabel("Nytt steg").fill(step);
    await badrum.getByRole("button", { name: "Lägg till" }).click();
    await expect(badrum.getByRole("button", { name: `Bocka av ${step}` })).toBeVisible();
  }
  await badrum.getByLabel("Lägg till kostnad").fill("112000");
  await badrum.getByRole("button", { name: "Kostnad" }).click();
  await expect(badrum.getByText("112 000 av 180 000 kr")).toBeVisible();
  await badrum.getByRole("button", { name: "Bocka av Riva kakel" }).click();
  await expect(badrum.getByText("1 av 3")).toBeVisible();
  await shot(page, "09-hemmet");

  // Hemmet: underhåll
  await page.goto("/hemmet?visa=underhall");
  await page.getByText("Nytt underhåll").click();
  await page.getByLabel("Vad?", { exact: true }).fill("Byta filter i ventilationen");
  await page.getByLabel("Var x:e dag").fill("180");
  await page.getByLabel("Senast gjort").fill(inFuture(-186));
  await page.locator("#owner").selectOption({ label: "Anna" });
  await page.getByRole("button", { name: "Lägg till" }).click();
  await expect(page.getByText("Försenad 6 dagar")).toBeVisible();
  await page.getByLabel("Vad?", { exact: true }).fill("Rensa takrännor");
  await page.getByLabel("Var x:e dag").fill("365");
  await page.getByLabel("Senast gjort").fill(inFuture(-300));
  await page.locator("#owner").selectOption({ label: "Ingen" });
  await page.getByRole("button", { name: "Lägg till" }).click();
  await expect(page.getByText("Om 65 dagar")).toBeVisible();
  await shot(page, "10-underhall");

  // Budget
  await page.goto("/mer");
  await page.getByRole("link", { name: /Budget/ }).click();
  await page.getByText("Ny kategori").click();
  for (const [name, limit] of [["Mat", "9000"], ["Bil", "2500"]]) {
    await page.getByLabel("Namn", { exact: true }).fill(name);
    await page.getByLabel("Per månad (kr)").fill(limit);
    await page.getByRole("button", { name: "Lägg till" }).click();
    await expect(page.getByText(`${limit === "9000" ? "9 000" : "2 500"} kr kvar`)).toBeVisible();
  }
  await page.getByText("Ny utgift").click();
  await page.getByLabel("Belopp (kr)").fill("2800");
  await page.getByLabel("Kategori", { exact: true }).selectOption({ label: "Bil" });
  await page.getByLabel("Vad", { exact: true }).fill("Däckbyte");
  await page.getByRole("button", { name: "Spara" }).click();
  await expect(page.getByText("300 kr över")).toBeVisible();
  await expect(page.getByText("8 700 kr")).toBeVisible();
  await shot(page, "11-budget");

  // Semester
  await page.goto("/kalender");
  await page.locator("summary", { hasText: "Lägg till" }).click();
  await page.getByLabel("Namn", { exact: true }).fill("Sommar i Toscana");
  await page.getByLabel("Från", { exact: true }).fill(inFuture(40));
  await page.getByLabel("Till", { exact: true }).fill(inFuture(53));
  await page.getByLabel("Plats", { exact: true }).fill("Lucca, Italien");
  await page.getByLabel(/Info/).fill("Agriturismo Il Poggio\nIncheckning 15:00\nBokningsnr: 88412");
  await page.getByLabel(/Packlista/).fill("Pass\nBoka hundvakt\nLaddare\nSolkräm");
  await page.getByLabel("Kopplat sparmål").selectOption({ label: "Semesterkassa Italien" });
  await page.getByRole("checkbox", { name: /Lägg till uppgifter inför resan/ }).uncheck();
  await page.getByRole("button", { name: "Spara" }).click();
  await expect(page.getByRole("heading", { name: "Sommar i Toscana" })).toBeVisible();
  await page.getByRole("button", { name: "Bocka av Pass" }).click();
  await expect(page.getByText("1 av 4")).toBeVisible();
  await shot(page, "06-semester");

  await page.goto("/kalender");
  await shot(page, "05-kalender");
  await page.goto("/");
  await expect(page.getByText("Sommar i Toscana")).toBeVisible();
  await expect(page.getByText("Byta filter i ventilationen")).toBeVisible();
  await expect(page.getByText("Rensa takrännor")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Nytt badrum/ })).toBeVisible();
  await expect(page.getByText("Semesterkassa Italien")).toBeVisible();
  await expect(page.getByText(/saknar ansvarig/)).toBeVisible();
  await shot(page, "02-hem");
  await page.goto("/mer");
  await shot(page, "07-mer");

  await page.goto("/familj");
  await page.getByRole("button", { name: "Logga ut" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("barnet loggar in och bockar av", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Barn" }).click();
  await page.getByLabel("Ditt namn").fill(child.username);
  await page.getByLabel("PIN-kod").fill("9999");
  await page.getByRole("button", { name: "Logga in" }).click();
  await expect(page.getByText("Fel namn eller PIN")).toBeVisible();
  await page.getByLabel("PIN-kod").fill(child.pin);
  await page.getByRole("button", { name: "Logga in" }).click();

  await expect(page.getByRole("heading", { name: /Ella/ })).toBeVisible();
  await page.getByRole("button", { name: "Klar med Dammsuga" }).click();
  await expect(page.getByText("Allt inskickat. Snyggt.")).toBeVisible();
  await expect(page.getByText("Väntar på mamma eller pappa")).toBeVisible();
  await shot(page, "08-barn-hem");

  await expect(page.getByText("Semesterkassa Italien")).toHaveCount(0);
  await page.goto("/rutiner?vem=alla");
  await expect(page.getByText("Ny syssla")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Bocka av Städa badrummet" })).toBeDisabled();
  await page.goto("/mal");
  await expect(page.getByText("Nytt mål")).toHaveCount(0);
  await expect(page.getByText("Semesterkassa Italien")).toBeVisible();
  await page.goto("/familj");
  await expect(page.getByText("Bjud in en vuxen")).toHaveCount(0);
  await page.goto("/mer");
  await expect(page.getByRole("link", { name: /Budget/ })).toHaveCount(0);
  await page.goto("/budget");
  await expect(page).toHaveURL(/\/mer/);
  await page.goto("/hemmet");
  await expect(page.getByText("Hantera")).toHaveCount(0);
});
