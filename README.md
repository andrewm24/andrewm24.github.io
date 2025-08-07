# ZHONG

A minimalist, Pokémon-themed web app that combines a Pomodoro-style timer with a private daily journal. All data stays in your browser.

## Features

- Adjustable focus timer with work/break lengths selectable from dropdown and saved between sessions
- Journal entries saved by date in `localStorage`
- Expand entries to read or edit
- Attach images or videos to journal entries
- Preview selected media before saving entries
- See existing attachments when editing entries
- Delete entries or edit them later
- Confetti celebration when the timer completes
- Capture a random Pokémon in your Pokédex every time the timer finishes
- Calming, responsive layout with playful Pokémon styling and subtle animations
- Spinning, bouncing Pokéball and scrolling Pokéball background for extra flair
- A running Pikachu sprite dashes across the page
- Smoothly animated circular countdown with progress ring
- Offline-ready via simple service worker caching

## Usage

Open `index.html` in a modern browser. The date field defaults to today; write a reflection and press **Save Entry**. Click past entries to expand or edit them.

Entries and timer data are stored locally in `localStorage`. Clearing browser data removes them. The site can be hosted as static files, e.g. with GitHub Pages.
=======
# Daily Vlog

A lightweight personal diary web app. Record a single entry for each day with text, a photo, a short video, and an optional mood tag. Entries are stored locally in your browser so the diary stays private.

## Features
- Password-protected access.
- Add/edit one entry per day (photo + video + text).
- Reverse-chronological timeline.
- Jump to any date with the calendar picker.
- Export all entries to a JSON backup.
- Light/dark theme toggle.

## Usage
Open `index.html` in a modern browser. The first visit asks you to set a password. After logging in you can create entries and view your timeline.

Data is saved in `localStorage`; clearing browser data removes entries.

## Hosting
Because the app is a static site it can be hosted on GitHub Pages. Commit the repository and enable Pages on the `main` branch.
