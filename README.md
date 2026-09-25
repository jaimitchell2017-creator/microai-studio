# MicroAI Studio V1

A polished browser-based AI + micro:bit playground.

## What is included

- Futuristic responsive UI
- Supabase Auth sign-in / account creation
- Supabase cloud projects with your existing RLS database
- Local fallback project saving
- Teachable Machine image model URL loading
- Live camera predictions and confidence
- Class → micro:bit command mapping
- Web Bluetooth micro:bit UART connection
- MakeCode JavaScript generator
- MicroPython starter generator
- Server-side OpenAI assistant through a Supabase Edge Function
- Project delete/open/refresh
- AI assistant project context
- Demo mapping
- No OpenAI secret in the frontend

## Important architecture

GitHub Pages hosts the frontend.

Supabase hosts:
- Auth
- Postgres database
- Edge Function

OpenAI is called ONLY from the Edge Function. The browser never receives OPENAI_API_KEY.

## 1. Supabase database

The SQL database has already been created for this project:
- profiles
- projects
- project_versions
- microbit_devices
- ai_settings

## 2. Deploy the OpenAI Edge Function

In Supabase Dashboard:

1. Open your project.
2. Go to Edge Functions.
3. Choose "Deploy a new function" → "Via Editor".
4. Name it:
   microai-chat
5. Replace the generated function code with:
   supabase/functions/microai-chat/index.ts
6. Deploy / save the function.

Your `OPENAI_API_KEY` secret should already exist under Edge Function Secrets.

The function uses the authenticated user's Supabase session and calls the OpenAI Responses API server-side.

## 3. Frontend

`config.js` already contains the Supabase project URL and publishable key supplied for this project.

The publishable key is intended for browser use when RLS is enabled. NEVER put a Supabase secret/service-role key or OPENAI_API_KEY in this folder.

## 4. GitHub Pages

Upload the contents of this folder to a GitHub repository.

Then:
1. GitHub → repository → Settings
2. Pages
3. Deploy from branch
4. Choose your main branch and `/ (root)`
5. Save

Wait for GitHub Pages to publish.

Use the HTTPS GitHub Pages URL for camera and Web Bluetooth.

## 5. Teachable Machine

Train an image project at:
https://teachablemachine.withgoogle.com/

Export the image model and copy its model URL.

Paste it into MicroAI Studio → AI Lab → Camera + model.

## 6. micro:bit

Use the generated MakeCode JavaScript in the Code Lab.

The browser sends newline-delimited commands to the micro:bit Bluetooth UART RX characteristic.

Default command examples:
HAPPY
SAD
MAYBE
CLEAR
HELLO
HEART
UP
DOWN
LEFT
RIGHT

Browser Bluetooth support varies. A Chromium browser on a compatible computer is recommended.

## Security

Safe in frontend:
- Supabase URL
- Supabase publishable key

Never commit:
- OPENAI_API_KEY
- Supabase secret key
- Supabase service_role key
- database passwords
- other private credentials

## Notes

The camera prediction runs locally in the browser through TensorFlow.js + Teachable Machine. Camera frames are not uploaded to the OpenAI function by this V1.
