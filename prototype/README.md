# Cinematic Listings prototype

This directory is the reusable vertical slice of the Cinematic Listings engine.

Serve the repository root so property media resolve:

```bash
python3 -m http.server 8080
```

Review routes:

- `/prototype/?property=17-ocean#arrival`
- `/prototype/?property=columbus-01#exterior`

Implemented:
- one renderer for both concept properties
- all 10 canonical scene slots for each property
- deterministic media paths that match each property's MEDIA-MANIFEST.json
- automatic PENDING fallback when an expected media file is not present
- scene-by-scene wheel, keyboard and swipe navigation
- direct scene URLs through hashes
- concept disclosure in every scene
- reduced-motion support
- visible focus and keyboard controls
- mobile-specific layout
- final product explanation with contact intentionally disabled

The prototype remains `noindex,nofollow`.

Media handoff:
1. Produce the exact files defined in each `ASSET-SCRIPT-PACK.md`.
2. Put accepted masters in `properties/<property>/media/` using the required manifest basenames.
3. Run `node scripts/validate-media.mjs`.
4. When the media gate passes, the prototype uses the production frames automatically; no data-file rewiring is required.

Remaining offerability gates:
1. approved continuity media pack for 17 OCEAN production scenes
2. approved continuity media pack for Columbus 01
3. public logged-out review deployment
4. full desktop and phone QA on both properties
5. approved live enquiry/viewing path for the eventual client build

Do not replace missing media with invented listing photography.
