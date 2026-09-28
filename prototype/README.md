# Cinematic Listings prototype

This directory is the first reusable vertical slice of the Cinematic Listings engine.

Serve the repository root so the 17 OCEAN reference media resolve:

```bash
python3 -m http.server 8080
```

Review routes:

- `/prototype/?property=17-ocean#arrival`
- `/prototype/?property=columbus-01#exterior`

Implemented:
- one renderer for both property concepts
- scene-by-scene wheel, keyboard and swipe navigation
- direct scene URLs through hashes
- concept disclosure in every scene
- reduced-motion support
- visible focus and keyboard controls
- mobile-specific layout
- honest asset-pending state for Columbus 01
- final product explanation with contact intentionally disabled

The prototype remains `noindex,nofollow`.

Remaining offerability gates:
1. approved continuity media pack for 17 OCEAN production scenes
2. approved continuity media pack for Columbus 01
3. public logged-out review deployment
4. full desktop and phone QA on both properties
5. approved live enquiry/viewing path for the eventual client build

Do not replace the asset-pending state with invented listing photography.
