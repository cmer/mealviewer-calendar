// Turns a school's MealViewer menu into an iCalendar feed that Skylight, Google Calendar,
// Apple Calendar etc. can subscribe to. Settings come from the [vars] in wrangler.toml.

const DAYS_BACK = 7;
const DAYS_AHEAD = 35;
const CACHE_SECONDS = 3600;
const FETCH_TIMEOUT_MS = 10_000;

const KEEP_TYPES = { ENTREES: "Entrées", VEGETABLE: "Veggies", "Breads/Grains": "Sides", FRUIT: "Fruit" };
const CONDIMENTS = new Set([
  "ketchup", "mustard", "ranch", "mayo", "mayonnaise", "margarine", "butter",
  "syrup", "salsa", "cream cheese", "sour cream", "jelly", "honey",
]);
// Standalone sauces/garnishes ("Sweet Chili Sauce"), but not dishes served with one ("Nachos with Cheese Sauce").
const CONDIMENT_SUFFIX = /\b(sauce|dressing|garnish|dip|gravy)$/i;
const SERVED_WITH = /\bw\/|\bwith\b/i;
// Everyday staples (sunbutter & jelly sandwiches, bread rolls) stay in the notes but don't crowd the event title.
const TITLE_SKIP = /^(SBJ|WBJ|PBJ) Sandwich$|\broll$/i;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== "/lunch.ics" && url.pathname !== "/menus") {
      return new Response("Not found", { status: 404 });
    }

    let config;
    try {
      config = readConfig(env);
    } catch (err) {
      return new Response(err.message, { status: 500 });
    }

    // Lists the menu names MealViewer has for this school, to help pick the right MEAL setting.
    if (url.pathname === "/menus") {
      try {
        const names = await fetchMenuNames(config);
        const body = names.length
          ? `Menus found for ${config.schoolId} (set MEAL to one of these):\n\n${names.join("\n")}\n`
          : `No menus found for ${config.schoolId} in the next few weeks. Check SCHOOL_ID, or try again once the school posts its menu.\n`;
        return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      } catch (err) {
        console.error("Failed to load menu names:", err);
        return new Response("Menu temporarily unavailable", { status: 502 });
      }
    }

    const cache = caches.default;
    const cacheKey = new Request(url.origin + url.pathname);
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    let ics;
    try {
      const days = await fetchMenu(config);
      ics = buildCalendar(days, config);
    } catch (err) {
      console.error("Failed to load menu:", err);
      return new Response("Menu temporarily unavailable", { status: 502 });
    }

    const response = new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
      },
    });
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
};

function readConfig(env) {
  const schoolId = String(env.SCHOOL_ID ?? "").trim();
  if (!/^[A-Za-z0-9-]+$/.test(schoolId) || schoolId === "YOUR-SCHOOL-ID") {
    throw new Error("SCHOOL_ID is not set. Add it under [vars] in wrangler.toml and redeploy.");
  }
  const timezone = String(env.TIMEZONE || "America/New_York");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    throw new Error(`TIMEZONE "${timezone}" is not a valid IANA time zone name.`);
  }
  return {
    schoolId,
    meal: String(env.MEAL || "Lunch"),
    timezone,
    calendarName: String(env.CALENDAR_NAME || "School Lunch"),
    eventPrefix: String(env.EVENT_PREFIX || "🍽 Lunch:"),
  };
}

async function fetchSchedules({ schoolId, timezone }) {
  const today = todayInTZ(timezone);
  const start = addDays(today, -DAYS_BACK);
  const end = addDays(today, DAYS_AHEAD);
  const api = `https://api.mealviewer.com/api/v4/school/${encodeURIComponent(schoolId)}/${mdy(start)}/${mdy(end)}/0`;

  const res = await fetch(api, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; mealviewer-calendar)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`MealViewer returned ${res.status}`);
  const data = await res.json();
  return data.menuSchedules ?? [];
}

async function fetchMenuNames(config) {
  const names = new Set();
  for (const schedule of await fetchSchedules(config)) {
    for (const block of schedule.menuBlocks ?? []) {
      if (block.blockName) names.add(String(block.blockName).replace(/[\x00-\x1f\x7f]+/g, " ").trim());
    }
  }
  return [...names].sort();
}

async function fetchMenu(config) {
  const { meal } = config;
  const schedules = await fetchSchedules(config);

  const days = [];
  for (const schedule of schedules) {
    const date = schedule.dateInformation?.dateFull?.slice(0, 10);
    const block = (schedule.menuBlocks ?? []).find((b) => b.blockName === meal);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !block) continue;

    const groups = Object.fromEntries(Object.keys(KEEP_TYPES).map((type) => [type, []]));
    let theme = null;
    for (const line of block.cafeteriaLineList?.data ?? []) {
      for (const item of line.foodItemList?.data ?? []) {
        const name = String(item.item_Name ?? "").replace(/[\x00-\x1f\x7f]+/g, " ").trim();
        const themeMatch = name.match(/^\*(.+)\*$/); // e.g. "*HOLIDAY MEAL!*"
        if (themeMatch) {
          theme = titleCase(themeMatch[1]);
          continue;
        }
        const group = groups[item.item_Type];
        if (!group || !name) continue;
        if (name === name.toUpperCase()) continue; // section header like "FEATURED ENTREES"
        if (isCondiment(name)) continue;
        if (!group.includes(name)) group.push(name);
      }
    }
    if (Object.values(groups).some((items) => items.length)) days.push({ date, theme, groups });
  }
  return days;
}

function buildCalendar(days, { schoolId, timezone, calendarName, eventPrefix }) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//mealviewer-calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    `X-WR-TIMEZONE:${timezone}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];

  for (const { date, theme, groups } of days) {
    const ymd = date.replace(/-/g, "");
    const next = addDays(date, 1).replace(/-/g, "");
    const mains = groups.ENTREES.filter((name) => !TITLE_SKIP.test(name));
    // Fall back through the groups so a snack that's only fruit still gets a title.
    const dishes = [mains, ...Object.values(groups)].find((items) => items.length).join(" / ");
    const title = theme ? `${theme} ${dishes}` : dishes;
    const description = Object.entries(KEEP_TYPES)
      .filter(([type]) => groups[type].length)
      .map(([type, label]) => `${label}: ${groups[type].join(", ")}`)
      .join("\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:lunch-${schoolId}-${ymd}@school-lunch`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd}`,
      `DTEND;VALUE=DATE:${next}`,
      `SUMMARY:${escapeText(`${eventPrefix} ${title}`)}`,
      `DESCRIPTION:${escapeText(description)}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

function isCondiment(name) {
  const lower = name.toLowerCase();
  if (CONDIMENTS.has(lower)) return true;
  return CONDIMENT_SUFFIX.test(name) && !SERVED_WITH.test(name);
}

function titleCase(s) {
  return s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function escapeText(s) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n")
    .replace(/[\x00-\x1f\x7f]/g, ""); // any remaining control characters would break the line structure
}

// RFC 5545: lines longer than 75 octets are split, continuation lines start with a space.
function fold(line) {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const len = encoder.encode(ch).length;
    const limit = parts.length ? 74 : 75; // continuation lines lose one octet to the leading space
    if (size + len > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += len;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function todayInTZ(timezone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date()); // YYYY-MM-DD
}

function addDays(ymd, n) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function mdy(ymd) {
  const [y, m, d] = ymd.split("-");
  return `${m}-${d}-${y}`;
}
