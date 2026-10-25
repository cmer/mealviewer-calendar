# MealViewer → Calendar

Put your kid's school lunch menu on a family calendar — [Skylight](https://refer.skylightframe.com/wphpa29n) (Referral Code), Google Calendar, Apple Calendar, Outlook, or anything else that can subscribe to a calendar link.

If your school publishes its menu on **[MealViewer](https://schools.mealviewer.com/)**, this small, free [Cloudflare Worker](https://workers.cloudflare.com/) turns that menu into a calendar feed. Each school day becomes one all-day event:

> **🍽 Lunch: Chicken Tenders / Toasted Grilled Cheese**
> Entrées: Chicken Tenders, Toasted Grilled Cheese, SBJ Sandwich
> Veggies: Seasoned Corn, Fresh Cucumber Slices
> Fruit: Fresh Apple, Raisins

- Lunch, breakfast, snack: one setup can serve several menus and several schools, each as its own calendar, with the school's name in event titles if you like.
- Milk, condiments (ketchup, ranch, sauces…), and section headings are left out.
- Theme days like "Holiday Meal!" go into the title.
- The feed covers the past week and the next 5 weeks. New weeks show up on their own as the school posts them — nothing to maintain.

> This is an unofficial project, not affiliated with MealViewer or Skylight. It reads the same public menu data the MealViewer website shows. If MealViewer changes how that works, the feed may stop updating until this code is fixed.

## Set it up with an AI agent

If you use an AI coding agent that can run commands on your computer (like [Claude Code](https://claude.com/claude-code), Codex, Cursor, or GitHub Copilot's agent mode), paste this prompt and fill in the brackets:

```text
Set up https://github.com/joehallissey/mealviewer-calendar for me so my kid's school
menu shows up on my family calendar. Clone it and follow the instructions in its AGENTS.md.

- My school's MealViewer page: [paste the schools.mealviewer.com/school/... link]
- Menus I want: [e.g. lunch only / lunch and breakfast / lunch and afternoon snack]
- Other kids at different schools (optional): [their MealViewer links and menus]
- Show the school's name in event titles? [yes, e.g. "Lincoln" / no]
- My time zone: [e.g. Denver]
- My calendar app: [e.g. Skylight / Google Calendar / Apple Calendar]
```

The agent does the setup and hands you the calendar links. You'll still need to sign in to Cloudflare yourself when a browser window opens. A chat-only assistant without command access can't deploy, but it can walk you through the steps below.

## Set it up yourself

### What you need

- A school that uses MealViewer
- A free [Cloudflare account](https://dash.cloudflare.com/sign-up) (no credit card needed for Workers' free plan)
- [Node.js](https://nodejs.org/) 18 or newer
- About 10 minutes

### 1. Download the code

```bash
git clone https://github.com/joehallissey/mealviewer-calendar.git
```

```bash
cd mealviewer-calendar && npm install
```

### 2. Find your school's ID and menu names

Look up your school at [schools.mealviewer.com](https://schools.mealviewer.com/). Its page address ends with the school ID:

```
https://schools.mealviewer.com/school/123456-12345
                                      ^^^^^^^^^^^^ this part
```

Then list the menus that school posts:

```bash
npm run menus -- https://schools.mealviewer.com/school/123456-12345
```

```
Menus for LINCOLN ELEMENTARY (123456-12345). Use one of these as MEAL:

  Afternoon Snack
  Breakfast
  Elementary Lunch
```

Names vary a lot between schools, so copy the ones you want exactly, including capitals and spaces.

### 3. Add your school's details

```bash
cp wrangler.example.toml wrangler.toml
```

Open `wrangler.toml` and fill it in. For one lunch calendar it looks like this:

```toml
[vars]
SCHOOL_ID = "123456-12345"
TIMEZONE = "America/Denver"

[vars.FEEDS.lunch]
MEAL = "Elementary Lunch"
```

| Setting | What to put |
| --- | --- |
| `SCHOOL_ID` | The ID from step 2 |
| `TIMEZONE` | Your time zone, e.g. `"America/Denver"` ([list](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)) |
| `[vars.FEEDS.lunch]` | One calendar. The name after `FEEDS.` becomes the end of its link: `/lunch.ics` |
| `MEAL` | A menu name from step 2 |

`wrangler.toml` is git-ignored, so your school's details never get committed. For breakfast, snacks, kids at different schools, or school names in titles, see [More menus, more kids, more schools](#more-menus-more-kids-more-schools).

### 4. Deploy

```bash
npx wrangler login
```

```bash
npm run deploy
```

The deploy prints your Worker's address, like `https://school-lunch-calendar.<your-account>.workers.dev`. Each calendar's link is that address plus its feed name and `.ics`:

```
https://school-lunch-calendar.<your-account>.workers.dev/lunch.ics
```

Open it in a browser to check. It should download a small calendar file.

### 5. Subscribe to it

- **Skylight:** in the Skylight app, go to Calendar → Sync a new calendar, choose the iCal / URL option, and paste your link. If it won't accept `https://`, use `webcal://` instead.
- **Google Calendar:** on the web, Other calendars → **+** → From URL.
- **Apple Calendar:** File → New Calendar Subscription.
- **Outlook:** Add calendar → Subscribe from web.

Calendar apps check for updates on their own schedule, usually every few hours, so the first events can take a little while to appear.

## More menus, more kids, more schools

Each `[vars.FEEDS.<name>]` section in `wrangler.toml` is a separate calendar with its own link, so you can show or hide each one in your calendar app. Add as many as you like, then run `npm run deploy`.

### Lunch and breakfast at the same school

```toml
[vars]
SCHOOL_ID = "123456-12345"
TIMEZONE = "America/Denver"

[vars.FEEDS.lunch]
MEAL = "Elementary Lunch"

[vars.FEEDS.breakfast]
MEAL = "Breakfast"
```

That gives you `…/lunch.ics` and `…/breakfast.ics`.

### Kids at different schools

Give each school's feeds their own `SCHOOL_ID`. Feeds without one use the top-level `SCHOOL_ID`. Run `npm run menus` with each school's link to find its menu names, since they often differ between schools.

```toml
[vars]
SCHOOL_ID = "123456-12345"        # Lincoln Elementary
SCHOOL_NAME = "Lincoln"
TIMEZONE = "America/Denver"

[vars.FEEDS.lunch]
MEAL = "Elementary Lunch"

[vars.FEEDS.breakfast]
MEAL = "Breakfast"

[vars.FEEDS.kid2-lunch]
SCHOOL_ID = "654321-54321"        # Roosevelt Middle
SCHOOL_NAME = "Roosevelt"
MEAL = "Middle School Lunch"
```

That gives you three calendars: `…/lunch.ics` and `…/breakfast.ics` from Lincoln, and `…/kid2-lunch.ics` from Roosevelt. Any number of schools works the same way. All the schools need to be in the same time zone. If not, set `TIMEZONE` on the feeds that differ.

### Putting the school name in event titles

On a Skylight board, or any calendar showing several feeds at once, school names make it easy to tell whose lunch is whose. Add `SCHOOL_NAME`, a short name of your choosing, at the top level or on a feed:

```toml
SCHOOL_NAME = "Lincoln"
```

Events then read **🍽 Lincoln Lunch: Chicken Tenders / Toasted Grilled Cheese**, and the calendar is named "Lincoln Lunch".

- A top-level `SCHOOL_NAME` applies to every feed using the top-level `SCHOOL_ID`.
- A feed with its own `SCHOOL_ID` doesn't inherit the top-level name. Give it its own `SCHOOL_NAME`, as in the example above.
- Without `SCHOOL_NAME`, titles read "🍽 Lunch: …" and calendars are named "School Lunch".

### Custom labels

Calendars are named and events prefixed automatically based on the menu, e.g. "School Breakfast" with "🥞 Breakfast:", or "School Snack" with "🍎 Snack:". To use your own wording, add either of these to a feed. They override the automatic labels, including `SCHOOL_NAME`:

```toml
CALENDAR_NAME = "Sam's Breakfast"
EVENT_PREFIX = "🥯 Sam's breakfast:"
```

### All the settings

| Setting | Where | What it does |
| --- | --- | --- |
| `SCHOOL_ID` | top level or feed | Which school's menu to use (required somewhere) |
| `TIMEZONE` | top level or feed | Your time zone, e.g. `"America/Denver"` |
| `SCHOOL_NAME` | top level or feed | Optional short name added to titles: "🍽 Lincoln Lunch:" |
| `MEAL` | feed | The menu name, exactly as `npm run menus` lists it |
| `CALENDAR_NAME` | feed | Optional: the calendar's name in your app |
| `EVENT_PREFIX` | feed | Optional: the text before each event's dishes |

Feed names can use letters, numbers and dashes.

If you can't remember the exact menu names after deploying, open your Worker's address with `/menus` on the end.

**Upgrading from an older version?** A `wrangler.toml` with `MEAL` directly under `[vars]` and no `FEEDS` still works and serves `/lunch.ics`. Switch to `FEEDS` when you want more than one calendar. Keep a feed named `lunch` so your existing link keeps working.

## Keep your link private-ish

Anyone with a calendar link can see that menu, and the links include your Cloudflare account name and your feed names. The menus themselves are already public on MealViewer, but if you share screenshots or code, leave the links out. If you'd rather not put kids' names in links, use names like `kid1-lunch`. The calendar's display name (`CALENDAR_NAME`) can still say whatever you like.

## Customizing

Everything is in [`src/index.js`](src/index.js):

- **What counts as a condiment:** `CONDIMENTS` (exact names) and `CONDIMENT_SUFFIX` (anything ending in "sauce", "dressing", etc.)
- **Which food groups are included:** `KEEP_TYPES`. Add `MILK: "Milk"` to include milk.
- **Everyday items kept out of the title:** `TITLE_SKIP`
- **How far ahead and back:** `DAYS_AHEAD` and `DAYS_BACK`

After changing anything, run `npm run deploy` again.

## Testing locally

```bash
npm run dev
```

Then open http://localhost:8787/lunch.ics (or any of your feed names) or http://localhost:8787/menus.

## How it works

The Worker asks MealViewer's public menu API for your school's menu, keeps the meal each feed asks for, filters out condiments and headings, and returns the result as a standard `.ics` calendar file. Cloudflare caches each feed for an hour, so MealViewer gets at most one request an hour per feed however often calendar apps check.

## License

[MIT](LICENSE)
