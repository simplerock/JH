// Inspelning av hela Home Hub-flödet för familjen Hiew. Kräver en tom databas och en körande app.
// BASE=http://localhost:3000 PDF=program.pdf node e2e/demo/inspelning.mjs  (videon hamnar i e2e/demo/video)
import { chromium } from "@playwright/test";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3100";
const DIR = path.dirname(new URL(import.meta.url).pathname);
const PDF = process.env.PDF;
const pw = "hemligt123";
const joey = { email: "joey@hiew.demo", name: "Joey" };
const jaynie = { email: "jaynie@hiew.demo", name: "Jaynie" };
const kids = { haylee: { u: "haylee", pin: "1111" }, hayden: { u: "hayden", pin: "2222" } };

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH, slowMo: 90 });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: "sv-SE",
  timezoneId: "Europe/Stockholm",
  recordVideo: { dir: path.join(DIR, "video"), size: { width: 780, height: 1688 } },
});

// Textskylt överst och en markering där man trycker. Överlever sidbyten via localStorage.
await context.addInitScript(() => {
  const draw = () => {
    let el = document.getElementById("demo-cap");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-cap";
      el.style.cssText =
        "position:fixed;left:10px;right:10px;top:10px;z-index:99999;padding:10px 14px;border-radius:14px;background:rgba(11,60,50,.94);color:#f8ecd9;font:600 15px/1.35 system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25);pointer-events:none;transition:opacity .2s";
      document.documentElement.appendChild(el);
    }
    const t = localStorage.getItem("demo-cap") || "";
    el.textContent = t;
    el.style.opacity = t ? "1" : "0";
  };
  window.__demoCap = draw;
  // Luft ovanför sidan så att skylten inte täcker rubrikerna.
  const pad = () => {
    if (document.getElementById("demo-pad")) return;
    const st = document.createElement("style");
    st.id = "demo-pad";
    st.textContent = "body{padding-top:78px!important}";
    document.head.appendChild(st);
  };
  document.addEventListener("DOMContentLoaded", pad);
  document.addEventListener("DOMContentLoaded", draw);
  window.addEventListener("storage", draw);
  document.addEventListener(
    "pointerdown",
    (e) => {
      const d = document.createElement("div");
      d.style.cssText = `position:fixed;left:${e.clientX - 18}px;top:${e.clientY - 18}px;width:36px;height:36px;border-radius:50%;background:rgba(246,184,102,.55);border:2px solid #f6b866;z-index:99998;pointer-events:none;transition:transform .45s,opacity .45s`;
      document.documentElement.appendChild(d);
      requestAnimationFrame(() => { d.style.transform = "scale(1.8)"; d.style.opacity = "0"; });
      setTimeout(() => d.remove(), 500);
    },
    true,
  );
});

const page = await context.newPage();
const hold = (ms = 1400) => page.waitForTimeout(ms);
async function cap(text, ms = 2200) {
  await page.evaluate((t) => { localStorage.setItem("demo-cap", t); window.__demoCap?.(); }, text);
  await hold(ms);
}
const type = (loc, text) => loc.pressSequentially(text, { delay: 35 });
async function scroll(px, ms = 900) {
  await page.mouse.wheel(0, px);
  await hold(ms);
}
async function logout() {
  await page.goto(`${BASE}/familj`);
  await page.getByRole("button", { name: "Logga ut" }).click();
  await page.waitForURL(/login/);
}
async function loginParent(who) {
  await page.goto(`${BASE}/login`);
  await type(page.getByLabel("E-post"), who.email);
  await page.getByLabel("Lösenord").fill(pw);
  await page.getByRole("button", { name: "Logga in" }).click();
  await page.getByRole("heading", { level: 1 }).waitFor();
}
async function loginKid(k) {
  await page.goto(`${BASE}/login`);
  await page.getByRole("button", { name: "Barn" }).click();
  await type(page.getByLabel("Ditt namn"), k.u);
  await type(page.getByLabel("PIN-kod"), k.pin);
  await page.getByRole("button", { name: "Logga in" }).click();
  await page.getByText("poäng den här veckan").waitFor();
}
async function photo(buttonName, file) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: buttonName }).click();
  await (await chooser).setFiles(path.join(DIR, file));
  await page.getByText("Väntar", { exact: true }).first().waitFor();
}

// 1. Joey skapar familjen ------------------------------------------------------------
await page.goto(`${BASE}/login`);
await cap("Home Hub: familjen Hiews gemensamma app. Joey börjar med att skapa familjen.", 3200);
await page.getByRole("button", { name: "Nytt konto" }).click();
await type(page.getByLabel("E-post"), joey.email);
await page.getByLabel("Lösenord").fill(pw);
await page.getByRole("button", { name: "Skapa konto" }).click();
await page.waitForURL(/onboarding/);
await type(page.getByLabel("Familjens namn"), "Familjen Hiew");
await type(page.getByLabel("Ditt namn").first(), "Joey");
await page.getByRole("button", { name: "Skapa familj" }).click();
await page.getByRole("heading", { name: /Joey/ }).waitFor();
await cap("Joeys Hem visar bara det han ansvarar för. Nu läggs barnen till.");

await page.goto(`${BASE}/familj`);
await page.getByText("Lägg till barn").click();
for (const [name, k, color] of [["Haylee", kids.haylee, 3], ["Hayden", kids.hayden, 5]]) {
  await cap(`${name} får ett eget konto med namn och PIN. Ingen e-post behövs.`, 1600);
  await type(page.getByLabel("Namn", { exact: true }).first(), name);
  await type(page.getByLabel("Användarnamn"), k.u);
  await type(page.getByLabel(/PIN/), k.pin);
  await page.locator('input[name="color"]').nth(color).check({ force: true });
  await page.getByRole("button", { name: "Skapa barnkonto" }).click();
  await page.getByText(`${name} kan nu logga in`).waitFor();
  await hold(900);
}
await page.getByText("Lägg till barn").click();
const code = (await page.locator("code").innerText()).trim();
await page.locator("code").scrollIntoViewIfNeeded();
await cap(`Jaynie bjuds in med koden ${code}.`, 2600);

// 2. Sysslor via plusknappen ----------------------------------------------------------
await page.goto(`${BASE}/`);
await cap("Plusknappen: allt nytt läggs till härifrån. Bara föräldrar ser den.");
await page.getByRole("link", { name: "Lägg till" }).click();
await hold(1800);
await cap("Joey lägger upp barnens sysslor. Poäng, och foto som bevis där det behövs.");
await page.getByRole("link", { name: /^Syssla/ }).click();
const chore = async (title, who, rec, points, needsPhoto, area) => {
  await type(page.getByLabel("Vad ska göras?"), title);
  await page.getByLabel("Hur ofta").selectOption({ label: rec });
  await page.getByLabel("Rum", { exact: true }).fill(area);
  await page.getByLabel("Vem", { exact: true }).selectOption({ label: who });
  await page.getByLabel("Poäng (barn)").fill(String(points));
  await page.getByRole("checkbox", { name: "Kräver foto" }).setChecked(needsPhoto);
  await page.getByRole("button", { name: "Lägg till" }).click();
  await page.getByText("Tillagd").waitFor();
  await hold(500);
};
await chore("Bädda sängen", "Hayden", "Varje dag", 2, true, "Sovrum");
await chore("Läsa 20 minuter", "Hayden", "Varje dag", 3, false, "Skola");
await chore("Städa rummet", "Haylee", "Varje vecka", 8, true, "Sovrum");
await chore("Duka av efter middagen", "Haylee", "Varje dag", 2, false, "Kök");
await chore("Storhandla", "Joey", "Varje vecka", 0, false, "Övrigt");
await page.goto(`${BASE}/rutiner?vem=alla`);
await cap("Rutiner: allas sysslor, med poäng och kamera för det som kräver foto.", 2400);
await scroll(500, 1600);
await logout();

// 3. Jaynie går med och planerar resan -------------------------------------------------
await cap("Jaynie skapar sitt konto och går med i familjen med koden.", 1800);
await page.getByRole("button", { name: "Nytt konto" }).click();
await type(page.getByLabel("E-post"), jaynie.email);
await page.getByLabel("Lösenord").fill(pw);
await page.getByRole("button", { name: "Skapa konto" }).click();
await page.waitForURL(/onboarding/);
await type(page.getByLabel("Inbjudningskod"), code);
await type(page.getByLabel("Ditt namn").nth(1), "Jaynie");
await page.getByRole("button", { name: "Gå med" }).click();
await page.getByRole("heading", { name: /Jaynie/ }).waitFor();
await cap("Jaynie planerar resorna. Plusknappen, sedan Resa.");
await page.getByRole("link", { name: "Lägg till" }).click();
await page.getByRole("link", { name: /^Resa/ }).click();
await page.getByLabel("Typ").selectOption({ label: "Semester / resa" });
await type(page.getByLabel("Namn", { exact: true }), "Zhangjiajie");
await page.getByLabel("Från", { exact: true }).fill("2026-11-07");
await page.getByLabel("Till", { exact: true }).fill("2026-11-15");
await type(page.getByLabel("Plats"), "Hunan, Kina");
await page.getByLabel("Planerar").selectOption({ label: "Jaynie" });
await page.getByRole("checkbox", { name: /Lägg till uppgifter inför resan/ }).scrollIntoViewIfNeeded();
await cap("Mallen skapar uppgifterna inför resan: boka, pass, försäkring, pengar och packa åt barnen.", 3000);
await page.getByRole("button", { name: "Spara" }).click();
await page.getByRole("heading", { name: "Zhangjiajie" }).waitFor();
await cap("Resan finns. Inte bokat syns i rött tills flyget är bokat.", 2400);

if (PDF) {
  await page.getByText("Ladda upp underlag").scrollIntoViewIfNeeded();
  await cap("Resebyråns program laddas upp. Hela familjen kan öppna det.", 1800);
  await page.getByLabel("Ladda upp underlag").setInputFiles(PDF);
  await page.getByText("Uppladdat").waitFor();
  await hold(1200);
}
await cap("Med AI-nyckel läser Claude dokumentet och fyller i allt. Här fyller Jaynie i för hand.", 3000);
await page.getByRole("button", { name: "Fyll i eller ändra för hand" }).click();
const flight = async (date, no, from, to, dep, arr) => {
  await page.getByRole("button", { name: "Flyg", exact: true }).click();
  await page.getByLabel("Datum").last().fill(date);
  await page.getByLabel("Flightnummer").last().fill(no);
  await page.getByLabel("Avreseort").last().fill(from);
  await page.getByLabel("Ankomstort").last().fill(to);
  await page.getByLabel("Avgång").last().fill(dep);
  await page.getByLabel("Ankomst", { exact: true }).last().fill(arr);
};
await flight("2026-11-07", "MF 8656", "Kuala Lumpur (KUL)", "Changsha (CSX)", "14:40", "19:40");
await flight("2026-11-15", "MF 8655", "Changsha (CSX)", "Kuala Lumpur (KUL)", "08:25", "13:25");
for (const [name, cin, cout] of [["MAQO Hotel, Changsha", "2026-11-07", "2026-11-09"], ["Hilton Garden Inn, Wulingyuan", "2026-11-09", "2026-11-11"], ["Wingate by Wyndham, Fenghuang", "2026-11-12", "2026-11-14"]]) {
  await page.getByRole("button", { name: "Hotell", exact: true }).click();
  await page.getByLabel("Hotell", { exact: true }).last().fill(name);
  await page.getByLabel("Incheckning").last().fill(cin);
  await page.getByLabel("Utcheckning").last().fill(cout);
}
for (const [i, day] of ["Flyg till Changsha, incheckning", "Changsha: Chaozong Street", "Till Zhangjiajie", "Nationalparken och Bailong-hissen", "Glasbron över kanjonen"].entries()) {
  await page.getByRole("button", { name: "Dag", exact: true }).click();
  await page.getByRole("textbox", { name: `Dag ${i + 1}`, exact: true }).fill(day);
}
await page.getByRole("textbox", { name: /Viktigt att veta/ }).fill("Samling på KLIA kl 11:40\nPass måste gälla 6 månader efter hemresan\nLinbanor kan stänga vid dåligt väder");
await page.getByRole("button", { name: "Spara för hela familjen" }).scrollIntoViewIfNeeded();
await hold(800);
await page.getByRole("button", { name: "Spara för hela familjen" }).click();
await page.getByText("Sparat. Alla i familjen ser nu samma information.").waitFor();
await page.reload();
await cap("Flyg, hotell, program och viktigt att veta. Alla ser samma sak och slipper fråga.", 2600);
await scroll(450, 1300);
await scroll(450, 1300);
await scroll(500, 1500);
await cap("Inför resan: uppgifter med ansvarig och datum. Barnen packar själva, med foto och poäng.", 2800);
await scroll(500, 1200);

await page.goto(`${BASE}/`);
await cap("Jaynies Hem: resan överst, hennes uppgifter och familjens kalender.", 2200);
await page.getByRole("link", { name: "3 månader" }).click();
await hold(800);
await scroll(500, 1400);
await scroll(500, 1400);
await logout();

// 4. Hayden gör sin syssla --------------------------------------------------------------
await cap("Hayden loggar in med namn och PIN.", 1200);
await loginKid(kids.hayden);
await cap("Haydens Hem: veckans poäng, nivå och vad som krävs till nästa förmån.", 2800);
await cap("Bädda sängen kräver foto. Kameran öppnas direkt.", 1800);
await photo("Ta foto och skicka Bädda sängen", "stokig-sang.png");
await page.getByRole("button", { name: "Klar med Läsa 20 minuter" }).click();
await page.getByText("5 väntar på godkännande").waitFor();
await cap("Inget räknas förrän mamma eller pappa har godkänt. 5 poäng väntar.", 2600);
await logout();

// 5. Joey granskar ----------------------------------------------------------------------
await loginParent(joey);
await cap("Joey ser en notis på Hem. Fotot visar att sängen inte är bäddad.", 2800);
const bed = page.locator("div.py-3\\.5", { hasText: "Bädda sängen" });
await bed.getByText("Gör om").click();
await type(bed.getByLabel("Vad saknas?"), "Täcket ligger på golvet");
await bed.getByRole("button", { name: "Skicka" }).click();
await hold(900);
await page.locator("div.py-3\\.5", { hasText: "Läsa 20 minuter" }).getByRole("button", { name: "Godkänn" }).click();
await cap("Läsningen godkänns. Sängen får göras om, utan poäng.", 2400);
await logout();

// 6. Hayden gör om ----------------------------------------------------------------------
await loginKid(kids.hayden);
await cap("Hayden ser kommentaren, bäddar ordentligt och fotar igen.", 2600);
await photo("Ta foto och skicka Bädda sängen", "badd-sang.png");
await hold(1200);
await logout();

// 7. Jaynie godkänner -------------------------------------------------------------------
await loginParent(jaynie);
await cap("Den förälder som ser det först godkänner. Nu ser sängen bra ut.", 2400);
await page.locator("div.py-3\\.5", { hasText: "Bädda sängen" }).getByRole("button", { name: "Godkänn" }).click();
await hold(1000);
await page.getByText("Barnens vecka").scrollIntoViewIfNeeded();
await cap("Barnens vecka: poäng och nivå för varje barn.", 2200);
await logout();

await loginKid(kids.hayden);
await cap("Hayden har 5 poäng. Dagar i rad med alla sysslor ger bonus vid 7.", 2600);
await page.getByText("Inför Zhangjiajie").scrollIntoViewIfNeeded().catch(() => {});
await scroll(500, 1500);
await page.goto(`${BASE}/poang`);
await cap("Poäng och förmåner: Guld ger restaurangvalet. Under ribban ger mindre skärmtid.", 3000);
await scroll(500, 1600);
await logout();

// 8. Joey: veckans genomgång och kalendern ----------------------------------------------
await loginParent(joey);
await cap("På söndagar dyker Veckans genomgång upp på Hem.", 1800);
await page.getByRole("link", { name: /Veckans genomgång/ }).first().click();
await page.getByRole("heading", { name: "Veckans genomgång" }).waitFor();
await cap("Poäng och förmåner, vad som blev klart, saker att prata om och veckan som kommer.", 3000);
await scroll(500, 1500);
await scroll(600, 1500);
await page.goto(`${BASE}/kalender`);
await cap("Kalendern samlar allt med datum: resor, händelser, deadlines och underhåll.", 2600);
await scroll(500, 1200);
await page.getByText("Visa i iPhone- eller Google-kalendern").click();
await page.getByText("Visa i iPhone- eller Google-kalendern").scrollIntoViewIfNeeded();
await cap("En länk lägger allt i telefonens vanliga kalender och uppdateras av sig själv.", 3000);
await page.goto(`${BASE}/`);
await cap("Det är Home Hub. Alla vet vad som gäller och vad familjen jobbar mot.", 3500);

await page.close();
const video = await page.video().path();
await context.close();
await browser.close();
console.log(video);
