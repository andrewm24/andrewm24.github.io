# PokéJournal

A minimalist, Pokémon-themed web app that combines a Pomodoro-style timer with a private daily journal. All data stays in your browser.

## Features

- Adjustable focus timer with work/break lengths saved between sessions
- Journal entries saved by date in `localStorage`
- Expand, edit, or delete entries later
- Attach images or videos to journal entries and preview them before saving
- Track total focused minutes and session count
- Confetti celebration and random Pokémon capture when the timer completes
- Optional browser notification announcing each Pokémon you catch
- Calming, responsive layout with playful Pokémon styling and subtle animations
- Offline-ready via simple service worker caching
- Log in and pick a trainer before choosing your starter Pokémon
- Earn XP for each focus session and capture a new Pokémon after reaching the XP threshold
- Search journal entries and export them as JSON

## Usage

Open `index.html` in a modern browser. The date field defaults to today; write a reflection and press **Save Entry**. Click past entries to expand or edit them.

Entries and timer data are stored locally in `localStorage`. Clearing browser data removes them. The site can be hosted as static files, e.g. with GitHub Pages.
