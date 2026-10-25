# MealViewer → Calendar

Put your kid's school lunch menu on a family calendar — [Skylight](https://refer.skylightframe.com/wphpa29n) (Referral Code), Google Calendar, Apple Calendar, Outlook, or anything else that can subscribe to a calendar link.

If your school publishes its menu on **[MealViewer](https://schools.mealviewer.com/)**, this small, free [Cloudflare Worker](https://workers.cloudflare.com/) turns that menu into a calendar feed. Each school day becomes one all-day event:

> **🍽 Lunch: Chicken Tenders / Toasted Grilled Cheese**
> Entrées: Chicken Tenders, Toasted Grilled Cheese, SBJ Sandwich
> Veggies: Seasoned Corn, Fresh Cucumber Slices
> Fruit: Fresh Apple, Raisins

- Milk, condiments (ketchup, ranch, sauces…), and section headings are left out.
- Theme days like "Holiday Meal!" go into the title.
- The feed covers the past week and the next 5 weeks. New weeks show up on their own as the school posts them — nothing to maintain.

> This is an unofficial project, not affiliated with MealViewer or Skylight. It reads the same public menu data the MealViewer website shows. If MealViewer changes how that works, the feed may stop updating until this code is fixed.

## What you need

- A school that uses MealViewer
- A free [Cloudflare account](https://dash.cloudflare.com/sign-up) (no credit card needed for Workers' free plan)
- [Node.js](https://nodejs.org/) 18 or newer
- About 10 minutes

## Setup

### 1. Find your school's ID and menu name

Look up your school at [schools.mealviewer.com](https://schools.mealviewer.com/). Its page address ends with the school ID:

```
https://schools.mealviewer.com/school/123456-12345
                                      ^^^^^^^^^^^^ this part
```

Also note which menu you want. Schools often have several, like "Breakfast", "Lunch", "Elementary Lunch", or "Middle School Lunch". Step 4 shows how to list the exact names if you're not sure.

### 2. Download the code

```bash
git clone https://github.com/joehallissey/mealviewer-calendar.git
```

```bash
cd mealviewer-calendar && npm install
```

### 3. Add your school's details

```bash
cp wrangler.example.toml wrangler.toml
```

Open `wrangler.toml` and fill in the `[vars]` section:

| Setting | What to put |
| --- | --- |
| `SCHOOL_ID` | The ID from step 1, e.g. `"123456-12345"` |
| `MEAL` | The menu name exactly as MealViewer shows it, e.g. `"Lunch"` |
| `TIMEZONE` | Your time zone, e.g. `"America/Denver"` ([list](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)) |
| `CALENDAR_NAME` | Optional: the calendar's name in your app |
| `EVENT_PREFIX` | Optional: text in front of each event title, e.g. `"🥞 Breakfast:"` |

`wrangler.toml` is git-ignored, so your school's details never get committed.

### 4. Deploy

```bash
npx wrangler login
```

```bash
npm run deploy
```

The deploy prints your Worker's address, like `https://school-lunch-calendar.<your-account>.workers.dev`. Open that address with **`/menus`** on the end in a browser to see the exact menu names your school uses. If your `MEAL` doesn't match one exactly, fix it in `wrangler.toml` and run `npm run deploy` again.

Your calendar link is the address with **`/lunch.ics`** on the end:

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

## Choosing a different menu (breakfast, snack…)

Lunch is the default, but the feed works with any menu your school posts on MealViewer, like breakfast, after-school snack, or a Pre-K menu.

### See which menus your school has

Open your Worker's address with `/menus` on the end:

```
https://school-lunch-calendar.<your-account>.workers.dev/menus
```

You'll get a list like this:

```
Afternoon Snack
Breakfast
Elementary Lunch
Middle School Lunch
```

Names vary a lot between schools ("Breakfast", "Elementary Breakfast", "Breakfast in the Classroom"…), so copy yours exactly, including capitals and spaces.

### Switch the feed to a different menu

To change your existing calendar from lunch to, say, breakfast, edit the `[vars]` in `wrangler.toml`:

```toml
MEAL = "Breakfast"
CALENDAR_NAME = "School Breakfast"
EVENT_PREFIX = "🥞 Breakfast:"
```

Then run `npm run deploy`. Your calendar link stays the same (it still ends in `/lunch.ics`, which is fine). Calendar apps pick up the new menu on their next refresh.

### Add a second menu alongside lunch

To have lunch *and* breakfast (or a snack) as separate calendars, deploy a second copy of the Worker with its own settings. Each copy gets its own link, so you can turn them on and off separately in your calendar app.

1. Make a second settings file:

   ```bash
   cp wrangler.toml wrangler.breakfast.toml
   ```

2. In `wrangler.breakfast.toml`, give it a different `name` and set the menu:

   ```toml
   name = "school-breakfast-calendar"

   [vars]
   SCHOOL_ID = "123456-12345"
   MEAL = "Breakfast"
   TIMEZONE = "America/Denver"
   CALENDAR_NAME = "School Breakfast"
   EVENT_PREFIX = "🥞 Breakfast:"
   ```

3. Deploy it:

   ```bash
   npx wrangler deploy --config wrangler.breakfast.toml
   ```

4. Subscribe to the new link it prints, with `/lunch.ics` on the end, e.g. `https://school-breakfast-calendar.<your-account>.workers.dev/lunch.ics`.

Repeat with another name for an after-school snack calendar (e.g. `wrangler.snack.toml`, `EVENT_PREFIX = "🍎 Snack:"`). Extra settings files matching `wrangler.*.toml` are git-ignored too, except the example.

**Updating later:** `npm run deploy` only updates the main lunch Worker. After changing the code, also run `npx wrangler deploy --config wrangler.breakfast.toml` (and so on) for each extra copy.

## Keep your link private-ish

Anyone with your calendar link can see the menu, and the link includes your Cloudflare account name. The menu itself is already public on MealViewer, but if you share screenshots or code, leave the link out.

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

Then open http://localhost:8787/lunch.ics or http://localhost:8787/menus.

## How it works

The Worker asks MealViewer's public menu API for your school's menu, keeps the meal you chose, filters out condiments and headings, and returns the result as a standard `.ics` calendar file. Cloudflare caches it for an hour, so MealViewer gets at most one request an hour however often calendar apps check.

## License

[MIT](LICENSE)
