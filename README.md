isAWSback

isAWSback is a tiny, design-forward web app that checks the official AWS Health public status and answers with a single word: Yes or No. It is built by [Teda.dev](https://teda.dev), the simplest AI app builder for regular people.

How it works
- On app load, it fetches the public AWS Health status page using a CORS-friendly mirror from the browser, then applies a set of conservative heuristics to detect whether there are ongoing incidents.
- The result is displayed as a large, accessible Yes or No. Your last check is saved to localStorage so it persists across reloads.
- If the app cannot verify the status, it shows Unknown and links you to the official AWS Health page.

Project structure
- index.html: Landing page with hero card, product story, and CTA.
- app.html: The functional checker that performs the status read and shows the result.
- styles/main.css: Custom styles for the hero card, background pattern, and micro-interactions.
- scripts/helpers.js: Namespaced storage, networking, parsing, and checker utilities.
- scripts/ui.js: UI layer that initializes the app, renders state, and wires interactions.
- scripts/main.js: Entry point that boots the application.

Tech stack
- HTML5 + Tailwind CSS via CDN
- jQuery 3.7.x for DOM interactions and animations
- No build step required

Limitations
- This tool reads the public AWS Health page via mirrors to bypass CORS. If the mirror is unreachable or AWS changes the page markup or wording significantly, detection may be less accurate. In that case, the app will fall back to Unknown rather than misleading you.

Local development
- Open index.html in a modern browser.
- Click the CTA to open app.html and run checks.

Accessibility
- Large, high-contrast result text with clear color cues.
- Live regions for screen readers.
- Keyboard focus styles and touch-target sizes are included.

License
- For personal or internal team use. No warranty is provided.
