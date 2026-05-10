# Chrome Web Store Submission Notes

## Single Purpose

TriggerTemplate lets users save reusable text templates and expand them in webpage text fields by typing a trigger action.

## Suggested Short Description

Save reusable text templates and expand them anywhere by typing a custom trigger.

## Suggested Detailed Description

TriggerTemplate is a lightweight text expander for Chrome. Create reusable templates, assign each one a trigger action, and type that trigger in supported webpage text fields to insert the saved text.

Features:

- Local-first template library
- Draggable side panel
- Search templates by Trigger Name
- Reorder templates with drag and drop
- Import and export JSON backups
- Chrome Sync support for templates

TriggerTemplate does not require an account and does not send your templates to an external server.

## Permission Justifications

`storage`: Saves templates, template order, and local side-panel preferences.

`activeTab`: Lets the toolbar button send a message to the current tab so the in-page side panel can be opened after the user clicks the extension icon.

## Data Use Disclosure

Templates are user-created content stored with Chrome extension storage. The extension does not collect data on external servers, sell data, or use data for advertising.

## Remote Code Disclosure

No remote code is used. All JavaScript, HTML, CSS, and assets are packaged with the extension.

## Pre-Submission Checklist

- Enable GitHub Pages and use `https://fernando-gamboa.github.io/TriggerTemplate/privacy.html` as the privacy policy URL.
- Upload images from `store-assets/`:
  - `promo-small-440x280.png`
  - `promo-marquee-1400x560.png`
  - `screenshot-library-1280x800.png`
  - `screenshot-create-1280x800.png`
  - `screenshot-side-tab-1280x800.png`
- Confirm the extension works on common sites after loading unpacked.
- Upload `trigger-template.zip`.
