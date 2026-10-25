// Lists the menu names MealViewer has for a school over the next few weeks.
// Usage: npm run menus -- <school-id or MealViewer URL>

const input = process.argv[2] ?? "";
const schoolId = input.trim().replace(/\/+$/, "").split("/").pop();

if (!/^[A-Za-z0-9-]+$/.test(schoolId)) {
  console.error("Usage: npm run menus -- <school-id or MealViewer URL>");
  console.error("Example: npm run menus -- https://schools.mealviewer.com/school/123456-12345");
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

const names = new Set();
for (const schedule of data.menuSchedules ?? []) {
  for (const block of schedule.menuBlocks ?? []) {
    if (block.blockName) names.add(String(block.blockName).trim());
  }
}

const school = data.physicalLocation?.name;
if (!names.size) {
  console.log(`No menus posted for ${school ?? schoolId} in the next 5 weeks. Check the ID, or try again once the school posts its menu.`);
} else {
  console.log(`Menus for ${school ?? schoolId} (${schoolId}). Use one of these as MEAL:\n`);
  for (const name of [...names].sort()) console.log(`  ${name}`);
}
