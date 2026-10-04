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
  await page.getByLabel("Kategori").selectOption("Semester");
  await page.getByLabel("Deadline").fill(inFuture(240));
  await page.getByLabel("Mål", { exact: true }).fill("30 000");
  await page.getByLabel("Har nu").fill("6000");
  await page.getByRole("button", { name: "Skapa mål" }).click();
  const kassa = page.locator("article", { hasText: "Semesterkassa Italien" });
  await expect(kassa.getByText("6 000 / 30 000 kr")).toBeVisible();
  await kassa.getByLabel("Belopp att lägga till").fill("3000");
  await kassa.getByRole("button", { name: "Lägg till" }).click();
  await expect(kassa.getByText("9 000 / 30 000 kr")).toBeVisible();
  await expect(kassa.getByText("30%")).toBeVisible();

  // Mål: uppgifter
  await page.getByLabel("Vad vill ni uppnå?").fill("Fixa trädgården");
  await page.getByLabel("Kategori").selectOption("Hem");
  await page.getByText("Uppgifter", { exact: true }).click();
  await page.getByRole("button", { name: "Skapa mål" }).click();
  await expect(page.locator("article", { hasText: "Fixa trädgården" }).getByText("Inga uppgifter än")).toBeVisible();

  // Sysslor
  await page.goto("/rutiner");
  await page.getByText("Ny syssla").click();
  const add = async (title: string, recurrence: string, area: string, who: string, goal?: string) => {
    await page.getByLabel("Vad ska göras?").fill(title);
    await page.getByLabel("Hur ofta").selectOption({ label: recurrence });
    await page.getByLabel("Rum / område").fill(area);
    await page.getByLabel("Vem").selectOption({ label: who });
    await page.getByLabel("Del av mål").selectOption({ label: goal ?? "Inget" });
    await page.getByRole("button", { name: "Lägg till" }).click();
    await expect(page.getByText("Sysslan är tillagd")).toBeVisible();
    await expect(page.getByRole("button", { name: `Bocka av ${title}` })).toBeVisible();
  };
  await add("Diska", "Varje dag", "Kök", "Anna");
  await add("Dammsuga", "Varje vecka", "Vardagsrum", "Ella");
  await add("Städa badrummet", "Varje vecka", "Badrum", "Anna");
  await add("Byta lakan", "Varje vecka", "Sovrum", "Vem som helst");
  await add("Rensa ogräs", "En gång", "Ute", "Vem som helst", "Fixa trädgården");
  await add("Klippa häcken", "En gång", "Ute", "Anna", "Fixa trädgården");

  await page.getByRole("button", { name: "Bocka av Diska" }).click();
  await expect(page.getByRole("button", { name: "Ångra Diska" })).toBeVisible();
  await page.getByRole("button", { name: "Bocka av Rensa ogräs" }).click();
  await expect(page.getByRole("button", { name: "Ångra Rensa ogräs" })).toBeVisible();
  await shot(page, "04-rutiner");

  await page.goto("/mal");
  await expect(page.locator("article", { hasText: "Fixa trädgården" }).getByText("1 av 2 klara")).toBeVisible();
  await shot(page, "03-mal");

  // Semester
  await page.goto("/kalender");
  await page.locator("summary", { hasText: "Lägg till" }).click();
  await page.getByLabel("Namn").fill("Sommar i Toscana");
  await page.getByLabel("Från").fill(inFuture(40));
  await page.getByLabel("Till").fill(inFuture(53));
  await page.getByLabel("Plats").fill("Lucca, Italien");
  await page.getByLabel(/Info/).fill("Agriturismo Il Poggio\nIncheckning 15:00\nBokningsnr: 88412");
  await page.getByLabel(/Packlista/).fill("Pass\nBoka hundvakt\nLaddare\nSolkräm");
  await page.getByLabel("Kopplat sparmål").selectOption({ label: "Semesterkassa Italien" });
  await page.getByRole("button", { name: "Spara" }).click();
  await expect(page.getByRole("heading", { name: "Sommar i Toscana" })).toBeVisible();
  await page.getByRole("button", { name: "Bocka av Pass" }).click();
  await expect(page.getByText("1 av 4")).toBeVisible();
  await shot(page, "06-semester");

  await page.goto("/kalender");
  await shot(page, "05-kalender");
  await page.goto("/");
  await expect(page.getByText("Sommar i Toscana")).toBeVisible();
  await shot(page, "02-hem");
  await page.goto("/familj");
  await shot(page, "07-familj");

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
  await page.getByRole("button", { name: "Bocka av Dammsuga" }).click();
  await expect(page.getByRole("button", { name: "Ångra Dammsuga" })).toBeVisible();
  await shot(page, "08-barn-hem");

  await page.goto("/rutiner");
  await expect(page.getByText("Ny syssla")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Bocka av Städa badrummet" })).toBeDisabled();
  await page.goto("/mal");
  await expect(page.getByText("Nytt mål")).toHaveCount(0);
  await expect(page.getByText("Semesterkassa Italien")).toBeVisible();
  await page.goto("/familj");
  await expect(page.getByText("Bjud in en vuxen")).toHaveCount(0);
});
