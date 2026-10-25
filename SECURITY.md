# Security Policy

## Reporting a vulnerability

If you find a security problem in this project, please report it privately rather than opening a public issue.

Use GitHub's private reporting: go to the [Security tab](https://github.com/joehallissey/mealviewer-calendar/security) of this repo and click **Report a vulnerability**. Only the maintainer can see what you send.

It helps to include:

- What the problem is and where it is in the code
- Steps to reproduce it, or a small example
- What someone could do by exploiting it

This is a personal project maintained in spare time. I'll aim to acknowledge reports within a week and to fix confirmed issues as quickly as I can. I'll credit you in the fix unless you'd rather stay anonymous.

## Supported versions

Only the latest version on the `main` branch is supported. If you deployed an older copy, pull the latest code and run `npm run deploy` to pick up fixes.

## What's in scope

- The Worker code in `src/`
- The helper script in `scripts/`
- The example configuration and setup instructions, if following them would leave someone exposed

## What's out of scope

- **Calendar links being viewable by anyone who has them.** This is by design: calendar apps need a plain link to subscribe. The menus are already public on MealViewer. See "A note on privacy" in the README.
- **Problems in MealViewer, Cloudflare, Skylight or other services.** Please report those to the company that runs them.
- **Wrong or missing menu items.** That's a bug, not a security issue. Feel free to open a regular issue.
- **Vulnerabilities in development-only tools** (like Wrangler's local test server) that don't affect the deployed Worker. A regular issue or pull request is fine for these.

## Keeping your own copy safe

- This project doesn't need any passwords, API keys or tokens in its code or settings. If a guide or tool ever asks you to put one in `wrangler.toml`, don't.
- Sign in to Cloudflare only through `npx wrangler login`, which opens Cloudflare's own sign-in page.
- Keep your `wrangler.toml` out of public places. It's git-ignored by default, so it won't be committed unless you force it.
