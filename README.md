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
