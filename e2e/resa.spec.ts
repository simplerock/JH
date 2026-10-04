import { expect, test } from "@playwright/test";

// Jaynie lägger upp resan, laddar upp underlag och fyller i flyg. Barnet ser samma info och sin packuppgift.
const stamp = Date.now().toString(36);
const mom = { email: `jaynie.resa.${stamp}@example.com`, password: "hemligt123" };
const kid = { username: `hay${stamp}`.slice(0, 20), pin: "3333" };

function inFuture(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

test("resa med dokument, flyg och packuppgift", async ({ page, browser }, info) => {
  // En liten PDF som underlag
  const pdfPage = await browser.newPage();
  await pdfPage.setContent("<h1>Zhangjiajie</h1><p>MF 8656 KUL-CSX 14:40</p>");
  const pdfPath = info.outputPath("program.pdf");
  await pdfPage.pdf({ path: pdfPath });
  await pdfPage.close();

  await page.goto("/login");
  await page.getByRole("button", { name: "Nytt konto" }).click();
  await page.getByLabel("E-post").fill(mom.email);
  await page.getByLabel("Lösenord").fill(mom.password);
  await page.getByRole("button", { name: "Skapa konto" }).click();
  await page.getByLabel("Familjens namn").fill("Familjen Hiew");
  await page.getByLabel("Ditt namn").first().fill("Jaynie");
  await page.getByRole("button", { name: "Skapa familj" }).click();
  await expect(page.getByRole("heading", { name: /Jaynie/ })).toBeVisible();

  await page.goto("/familj");
  await page.getByText("Lägg till barn").click();
  await page.getByLabel("Namn", { exact: true }).first().fill("Haylee");
  await page.getByLabel("Användarnamn").fill(kid.username);
  await page.getByLabel(/PIN/).fill(kid.pin);
  await page.getByRole("button", { name: "Skapa barnkonto" }).click();
  await expect(page.getByText("Haylee kan nu logga in")).toBeVisible();

  // Resan
  await page.goto("/kalender");
  await page.locator("summary", { hasText: "Lägg till" }).click();
  await page.getByLabel("Namn", { exact: true }).fill("Zhangjiajie");
  await page.getByLabel("Från", { exact: true }).fill(inFuture(34));
  await page.getByLabel("Till", { exact: true }).fill(inFuture(42));
  await page.getByRole("checkbox", { name: /Lägg till uppgifter inför resan/ }).uncheck();
  await page.getByRole("button", { name: "Spara" }).click();
  await expect(page.getByRole("heading", { name: "Zhangjiajie" })).toBeVisible();
  await expect(page.getByText("Inte bokat")).toBeVisible();

  // Ladda upp underlag
  await page.getByLabel("Ladda upp underlag").setInputFiles(pdfPath);
  await expect(page.getByText("Uppladdat. Alla i familjen kan öppna dokumenten.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "program.pdf" })).toBeVisible();

  // Fyll i för hand
  await page.getByRole("button", { name: "Fyll i eller ändra för hand" }).click();
  await page.getByRole("button", { name: "Flyg", exact: true }).click();
  await page.getByLabel("Flightnummer").fill("MF 8656");
  await page.getByLabel("Avreseort").fill("Kuala Lumpur (KUL)");
  await page.getByLabel("Ankomstort").fill("Changsha (CSX)");
  await page.getByLabel("Avgång").fill("14:40");
  await page.getByLabel("Ankomst", { exact: true }).fill("19:40");
  await page.getByLabel("Bokningsnummer").fill("XK7P2Q");
  await page.getByRole("button", { name: "Hotell", exact: true }).click();
  await page.getByLabel("Hotell", { exact: true }).fill("MAQO Hotel, Changsha");
  await page.getByRole("button", { name: "Dag", exact: true }).click();
  await page.getByRole("textbox", { name: "Dag 1", exact: true }).fill("Flyg till Changsha, incheckning");
  await page.getByRole("textbox", { name: /Viktigt att veta/ }).fill("Samling på KLIA 11:40\nTa med pass");
  await page.getByRole("checkbox", { name: "Flyget är bokat" }).check();
  await page.getByRole("button", { name: "Spara för hela familjen" }).click();
  await expect(page.getByText("Sparat. Alla i familjen ser nu samma information.")).toBeVisible();

  await page.reload();
  await expect(page.locator("header").getByText("Bokat", { exact: true })).toBeVisible();
  await expect(page.getByText("Kuala Lumpur (KUL) → Changsha (CSX)")).toBeVisible();
  await expect(page.getByText("Bokning XK7P2Q")).toBeVisible();
  await expect(page.getByText("Samling på KLIA 11:40")).toBeVisible();
  await expect(page.getByText(/Uppdaterad .* av Jaynie/)).toBeVisible();

  // Packuppgift för Haylee med poäng och foto
  await page.getByText("+ Lägg till uppgift").click();
  await page.getByLabel("Uppgift").fill("Packa egen väska");
  await page.getByLabel("Vem").selectOption({ label: "Haylee" });
  await page.getByLabel("Poäng (barn)").fill("6");
  await page.getByRole("checkbox", { name: "Kräver foto" }).check();
  await page.locator("details", { hasText: "Lägg till uppgift" }).getByRole("button", { name: "Lägg till" }).click();
  await expect(page.getByRole("button", { name: "Bocka av Packa egen väska" })).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/30-resa-foralder.png", fullPage: true });

  // Haylee ser samma information
  const k = await (await browser.newContext()).newPage();
  await k.goto("/login");
  await k.getByRole("button", { name: "Barn" }).click();
  await k.getByLabel("Ditt namn").fill(kid.username);
  await k.getByLabel("PIN-kod").fill(kid.pin);
  await k.getByRole("button", { name: "Logga in" }).click();
  await expect(k.getByRole("button", { name: "Ta foto och skicka Packa egen väska" })).toBeVisible();
  await k.getByRole("link", { name: /Zhangjiajie/ }).click();
  await expect(k.getByText("Bokning XK7P2Q")).toBeVisible();
  await expect(k.getByRole("link", { name: "program.pdf" })).toBeVisible();
  await expect(k.getByText("Ladda upp underlag")).toHaveCount(0);
  await k.screenshot({ path: "e2e/screenshots/31-resa-barn.png", fullPage: true });
});
