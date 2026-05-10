# Trigger Template

A local-first Chrome text expander inspired by Magical. Save a trigger like `-test`, type it into a text field, then press space, tab, or enter to replace it with the saved template.

## What It Does

- Expands triggers in standard inputs, textareas, and common `contenteditable` editors.
- Stores templates in `chrome.storage.sync`.
- Uses a draggable in-page side panel for create/edit/delete.
- Includes an options page with JSON import/export.
- Uses Manifest V3 and can be loaded unpacked immediately.

## Install Locally

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `/Users/Fer/Desktop/Chrome Extensions/TriggerTemplate`.
5. Click the side tab or toolbar icon and add your templates.

## Use

1. Create a template with a trigger such as `-test`.
2. Go to a website with a text box.
3. Type `-test` and press space, tab, or enter.
4. The trigger is replaced with your saved template.

## Quick Test

Open `test-page.html` in Chrome after loading the extension. Create a template, then type its trigger in the search input, textarea, or editable box and press space.

## Package for Upload

From this folder, create the Web Store zip. Do not zip the parent folder itself.

```bash
npm run package
```

Upload `trigger-template.zip` in the Chrome Web Store Developer Dashboard.

## Storage Limits

Templates are stored in `chrome.storage.sync`. This version caps the library at 100 templates and checks template size before saving. Very large templates may need to be shortened because Chrome Sync has a small per-item quota.

## Report Bugs

Please report issues through GitHub Issues:

https://github.com/Fernando-Gamboa/TriggerTemplate/issues

## Notes

This extension focuses on text expansion. Magical also includes broader workflow automation, team features, AI writing tools, and integrations; those are intentionally outside this initial version.
