# PokéJournal

A minimalist, Pokémon-themed web app that combines a Pomodoro-style timer with a private daily journal. All data stays in your browser.

## Features

- Adjustable focus timer with work/break lengths saved between sessions
- Journal entries saved by date in `localStorage`
- Expand, edit, or delete entries later
- Attach images or videos to journal entries and preview them before saving
- Track total focused minutes and session count
- Confetti celebration and XP that trains your partner Pokémon
- Optional browser notification announcing each Pokémon you catch
- Calming, responsive layout with playful Pokémon styling and subtle animations
- Offline-ready via simple service worker caching
- Log in and pick a trainer before choosing your starter Pokémon
- Earn XP for each focus session (+10) and journal entry (+5) to level Pokémon
- Capture new Pokémon for your Pokédex as total XP milestones are met
- Search journal entries and export them as JSON

## Usage

Open `docs/index.html` in a modern browser. The date field defaults to today; write a reflection and press **Save Entry**. Click past entries to expand or edit them.

Entries and timer data are stored locally in `localStorage`. Clearing browser data removes them. The site can be hosted as static files, e.g. with GitHub Pages.

For authentication and large media uploads, run the optional Node.js backend located in `/server`:

```
cd server
npm install
npm start
```

The server persists user credentials in a SQLite database, streams uploaded
journal videos to disk, **and** serves the frontend so you can visit
`http://localhost:3000` to use PokéJournal with authentication enabled.
