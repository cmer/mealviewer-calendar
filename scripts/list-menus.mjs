// Lists the menu names MealViewer has for a school over the next few weeks.
// Usage: npm run menus -- <school-id or MealViewer URL>

const input = process.argv[2] ?? "";
const schoolId = input.trim().replace(/\/+$/, "").split("/").pop();

if (!/^[A-Za-z0-9-]+$/.test(schoolId)) {
  console.error("Usage: npm run menus -- <school-id or MealViewer URL>");
  console.error("Example: npm run menus -- https://schools.mealviewer.com/school/LincolnES");
  process.exit(1);
}

const mdy = (d) => `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${d.getFullYear()}`;
const start = new Date();
const end = new Date(start.getTime() + 35 * 24 * 60 * 60 * 1000);
const api = `https://api.mealviewer.com/api/v4/school/${encodeURIComponent(schoolId)}/${mdy(start)}/${mdy(end)}/0`;

const res = await fetch(api, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
if (!res.ok) {
  console.error(`MealViewer returned ${res.status}. Check the school ID: ${schoolId}`);
  process.exit(1);
}
const data = await res.json();

// Upstream text goes to the terminal, so strip control characters (e.g. ANSI escapes) first.
const clean = (value) => String(value ?? "").replace(/[\x00-\x1f\x7f]+/g, " ").replace(/\s+/g, " ").trim();

const names = new Set();
for (const schedule of data.menuSchedules ?? []) {
  for (const block of schedule.menuBlocks ?? []) {
    const name = clean(block.blockName);
    if (name) names.add(name);
  }
}

const school = clean(data.physicalLocation?.name) || null;
if (!names.size) {
  console.log(`No menus posted for ${school ?? schoolId} in the next 5 weeks. Check the ID, or try again once the school posts its menu.`);
} else {
  console.log(`Menus for ${school ?? schoolId} (${schoolId}). Use one of these as MEAL:\n`);
  for (const name of [...names].sort()) console.log(`  ${name}`);
}
