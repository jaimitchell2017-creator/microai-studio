# MicroAI Studio V1

A futuristic web app for experimenting with Google Teachable Machine image models and BBC micro:bit.

## What V1 does

- Paste a hosted Teachable Machine image-model URL.
- Load the model in the browser.
- Use your webcam for live predictions.
- Map model classes to micro:bit commands.
- Connect a micro:bit with Web Bluetooth where supported.
- Send `UP`, `DOWN`, `MAYBE`, or `CLEAR` over the micro:bit Bluetooth UART service.
- Includes ready-to-copy MakeCode JavaScript.
- Includes a MicroPython starter.
- Saves projects locally and exports/imports JSON.
- Includes an optional Node/OpenAI backend so an API key is never put in browser code.

## Run it

For the frontend, because browser camera/Bluetooth APIs require a secure context, use a local HTTPS server or deploy the folder to GitHub Pages/another HTTPS host.

A quick static test can be done with:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

For Web Bluetooth, browser/device support and secure-context requirements apply. Chrome/Edge on a compatible computer are recommended.

## Teachable Machine

1. Open Teachable Machine.
2. Create an Image Project.
3. Create classes such as `Thumbs Up`, `Thumbs Down`, `Maybe`.
4. Capture many training images.
5. Train.
6. Export the model and use its hosted/shareable URL.
7. Paste the URL into MicroAI Studio.

The app expects the URL to resolve to a folder containing `model.json` and `metadata.json`.

## micro:bit

The MakeCode JavaScript in the Code section starts the Bluetooth UART service and reacts to:

- `UP` → happy face
- `DOWN` → sad face
- `MAYBE` → confused face
- `CLEAR` → clear display

Paste the JavaScript into the micro:bit MakeCode JavaScript editor and flash it to the board.

## Cloud accounts

The V1 UI contains a cloud-ready project area, but it intentionally does not pretend that a database exists without configuration.

For real multi-device accounts, use Supabase:

- Auth for accounts
- `projects` table for project data
- Row Level Security so users can only access their own projects

Put the project URL and anon key in `js/config.js`, then add the Supabase browser SDK or your preferred auth layer.

## OpenAI

The `server/` folder contains a small Express backend.

```bash
cd server
npm install
cp .env.example .env
# put your OpenAI API key in .env
npm start
```

The browser should call your `/api/ai` endpoint. Never put a secret API key directly into frontend JavaScript.

## Important Bluetooth note

Web Bluetooth support is browser/platform dependent. The app detects when Web Bluetooth is unavailable and shows a message instead of failing silently.

The micro:bit must be running firmware/code that exposes the Bluetooth UART service. The supplied MakeCode program does that.

## GitHub

Upload the project contents to a GitHub repository. If you want GitHub Pages, deploy the root folder as the static frontend. The optional Node server must be hosted separately (for example on a service that runs Node).

## Project structure

```text
MicroAI-Studio/
  index.html
  css/style.css
  js/config.js
  js/app.js
  server/
    server.js
    package.json
    .env.example
  README.md
```
