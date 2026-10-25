# MealViewer → Calendar

Get your kid's school lunch menu onto the family calendar. Works with [Skylight](https://refer.skylightframe.com/wphpa29n) (Referral Code), Google Calendar, Apple Calendar, Outlook, or any calendar app that can subscribe to a link.

If your school posts its menu on **[MealViewer](https://schools.mealviewer.com/)**, this small, free [Cloudflare Worker](https://workers.cloudflare.com/) turns that menu into a calendar feed you can subscribe to. Once it's set up there's nothing else to do: new weeks appear on your calendar as the school posts them.

Each school day becomes one all-day event:

> **🍽 Lunch: Chicken Tenders / Toasted Grilled Cheese**
> Entrées: Chicken Tenders, Toasted Grilled Cheese, Sunbutter & Jelly Sandwich
> Veggies: Seasoned Corn, Fresh Cucumber Slices
> Fruit: Fresh Apple, Raisins

A few details:

- Milk, ketchup, ranch and other condiments are left out, along with headings like "FEATURED ENTREES".
- Special days like "Holiday Meal!" show up in the title.
- You can set up breakfast, snacks, or lunch at more than one school. Each gets its own calendar.
- The calendar shows the past week and the next five weeks.

> This is a personal project, not affiliated with MealViewer or Skylight. It reads the same public menu that the MealViewer website shows. If MealViewer changes their website, this may stop working until someone updates the code.

## Let an AI assistant set it up

If you use an AI tool that can run commands on your computer, such as [Claude Code](https://claude.ai/referral/6X4R68E8dQ?s=claude_ai) (Referral Code), Codex, Cursor, or GitHub Copilot in agent mode, you can hand it this and fill in the blanks:

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

It will do the steps below and give you the calendar links when it's done. At one point a browser window will open asking you to sign in to Cloudflare. That part is yours to do.

A chat-only assistant (one that can't run anything on your computer) can't do the setup for you, but it can help you through the steps below.

## Set it up yourself

### What you need

- A school that uses MealViewer
- A free [Cloudflare account](https://dash.cloudflare.com/sign-up). No credit card needed.
- [Node.js](https://nodejs.org/) version 18 or newer. This is what runs the setup commands.
- About 10 minutes

You'll be typing a few commands into the Terminal app (Mac) or Command Prompt (Windows). Each one is shown in a box below. Copy it, paste it, and press Enter.

### 1. Download the code

```bash
git clone https://github.com/joehallissey/mealviewer-calendar.git
```

```bash
cd mealviewer-calendar && npm install
```

### 2. Find your school's ID and menu names

Look up your school at [schools.mealviewer.com](https://schools.mealviewer.com/). The web address of its page ends with the school's ID:

```
https://schools.mealviewer.com/school/123456-12345
                                      ^^^^^^^^^^^^ this part
```

Then run this to see which menus your school posts (use your own link):

```bash
npm run menus -- https://schools.mealviewer.com/school/123456-12345
```

```
Menus for LINCOLN ELEMENTARY (123456-12345). Use one of these as MEAL:

  Afternoon Snack
  Breakfast
  Elementary Lunch
```

Every school names its menus a little differently, so write down the ones you want exactly as shown, capitals and all.

### 3. Fill in your school's details

Make your settings file:

```bash
cp wrangler.example.toml wrangler.toml
```

Open `wrangler.toml` in any text editor and fill it in. For a single lunch calendar it looks like this:

```toml
[vars]
SCHOOL_ID = "123456-12345"
TIMEZONE = "America/Denver"

[vars.FEEDS.lunch]
MEAL = "Elementary Lunch"
```

| Line | What to put |
| --- | --- |
| `SCHOOL_ID` | The ID from step 2 |
| `TIMEZONE` | Your time zone, like `"America/Denver"`. [Here's the full list.](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) |
| `[vars.FEEDS.lunch]` | Starts one calendar. The word after `FEEDS.` becomes the end of its link, so this one will be `/lunch.ics` |
| `MEAL` | One of the menu names from step 2 |

`wrangler.toml` is git-ignored, so your school's details never get committed.

Want breakfast too, or kids at different schools? See [Breakfast, snacks, and more than one kid](#breakfast-snacks-and-more-than-one-kid) below. You can also come back and add those later.

### 4. Deploy

Sign in to Cloudflare. This opens a browser window:

```bash
npx wrangler login
```

Then deploy:

```bash
npm run deploy
```

When it finishes, it prints your Worker's address, like `https://school-lunch-calendar.<your-account>.workers.dev`. Your calendar link is that address with `/lunch.ics` on the end:

```
https://school-lunch-calendar.<your-account>.workers.dev/lunch.ics
```

Paste it into a browser to check. It should download a small calendar file.

### 5. Add it to your calendar app

- **Skylight:** open the Skylight app, go to Calendar, then Sync a new calendar, choose the iCal / URL option, and paste your link. If it won't accept a link starting with `https://`, change that part to `webcal://`.
- **Google Calendar:** on a computer, next to "Other calendars" click **+**, then "From URL".
- **Apple Calendar:** File menu, then "New Calendar Subscription".
- **Outlook:** "Add calendar", then "Subscribe from web".

Calendar apps check for updates every few hours, so give it a little while for the first events to appear.

## Breakfast, snacks, and more than one kid

Each `[vars.FEEDS.something]` section in your settings file is one feed: a separate calendar with its own link. Add as many as you want, then run `npm run deploy` again. Because each is a separate calendar, you can turn them on and off one at a time in your calendar app.

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

Now you have two links: one ending in `/lunch.ics` and one ending in `/breakfast.ics`.

### Kids at different schools

Give a feed its own `SCHOOL_ID` to point it at a different school. Feeds without one inherit the top-level `SCHOOL_ID`. Run `npm run menus` with the other school's link first, since its menus will probably have different names.

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

That's three calendars: lunch and breakfast from Lincoln, and `/kid2-lunch.ics` from Roosevelt. Add more schools the same way. If a school is in a different time zone, set `TIMEZONE` on its feed.

### Showing the school's name in the title

When several calendars share one screen, it helps to see whose lunch is whose. Add a `SCHOOL_NAME` line with a short name, and it goes into the titles:

```toml
SCHOOL_NAME = "Lincoln"
```

Events now read **🍽 Lincoln Lunch: Chicken Tenders / Toasted Grilled Cheese**, and the calendar is called "Lincoln Lunch".

A top-level `SCHOOL_NAME` applies to every feed using the top-level `SCHOOL_ID`. A feed with its own `SCHOOL_ID` doesn't inherit it, so give that feed its own `SCHOOL_NAME`, as in the example above. Without it, titles just say "🍽 Lunch:" and the calendar is called "School Lunch".

### Your own wording

Calendars get sensible names on their own: a breakfast menu becomes "School Breakfast" with titles starting "🥞 Breakfast:", a snack menu gets "🍎 Snack:", and so on. If you'd rather write your own, add either of these lines to a feed:

```toml
CALENDAR_NAME = "Sam's Breakfast"
EVENT_PREFIX = "🥯 Sam's breakfast:"
```

### Every setting in one place

| Setting | Where | What it does |
| --- | --- | --- |
| `SCHOOL_ID` | top level or feed | Which school's menu to use |
| `TIMEZONE` | top level or feed | Your time zone, like `"America/Denver"` |
| `SCHOOL_NAME` | top level or feed | Optional. A short school name for the titles |
| `MEAL` | feed | The menu name, exactly as `npm run menus` shows it |
| `CALENDAR_NAME` | feed | Optional. What the calendar is called in your app |
| `EVENT_PREFIX` | feed | Optional. The words before the dishes in each title |

Feed names (the part after `FEEDS.`) can have letters, numbers and dashes.

Forgot a menu's exact name? Open your Worker's address with `/menus` on the end to see them all.

**Set this up before the multi-calendar version?** A `wrangler.toml` with `MEAL` directly under `[vars]` and no `FEEDS` still works and serves `/lunch.ics`. Switch to `FEEDS` when you want a second calendar. Keep a feed named `lunch` and your existing link keeps working.

## A note on privacy

Anyone who has your calendar link can see that menu. The link also includes your Cloudflare account name and your feed names. The menus are public on MealViewer anyway, but if you share screenshots or code, leave the links out. If you'd rather not have kids' names in links, name the feeds something like `kid1-lunch` and use `CALENDAR_NAME` for the friendly name.

## For tinkerers

### Changing what gets filtered

Everything is in [`src/index.js`](src/index.js):

- **What counts as a condiment:** `CONDIMENTS` (exact names) and `CONDIMENT_SUFFIX` (anything ending in "sauce", "dressing", etc.)
- **Which food groups are included:** `KEEP_TYPES`. Add `MILK: "Milk"` to include milk.
- **Everyday items kept out of the title:** `TITLE_SKIP`
- **How far ahead and back:** `DAYS_AHEAD` and `DAYS_BACK`

Run `npm run deploy` after changing anything.

### Trying it on your computer first

```bash
npm run dev
```

Then open http://localhost:8787/lunch.ics (or any of your feed names) or http://localhost:8787/menus.

### How it works

The Worker asks MealViewer's public menu API for your school's menu, keeps the meal each feed asks for, drops condiments and headings, and returns a standard `.ics` calendar file. Cloudflare caches each calendar for an hour, so MealViewer gets at most one request per hour per calendar no matter how often your apps check.

## License

[MIT](LICENSE)
