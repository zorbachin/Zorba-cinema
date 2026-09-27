# CINEMATIC LISTINGS — Connected Storyboard v1

Status: DRAFT IMPLEMENTATION HANDOFF
Canonical build owner: zorbachin/Zorba-cinema
Duplicate-build check: no parallel app. This storyboard is for the existing repo only.

## Visitor POV
The visitor is not “scrolling a landing page.” They are being guided through a property while always retaining a clear way to exit, view facts or contact the agent in a real client build.

## Camera path / scene logic

### 17 OCEAN — CINEMATIC treatment
ARRIVAL
POV: distant / environmental.
Movement: gentle push toward property context.
Destination: recognize the property world.
Transition: horizon/coast line carries into approach.

APPROACH
POV: walking toward entry.
Movement: one composed forward move.
Destination: portal/door.
Transition: doorway rectangle becomes mask.

THRESHOLD
POV: crossing the door.
Movement: short auto-complete after user advances.
Destination: living room axis.
Transition: dark door edge wipes to interior reveal.

LIVING
POV: standing inside.
Movement: quiet parallax / optional look.
Destination: strongest room understanding.
Transition: architectural line or glazing edge advances to next room.

SPATIAL GALLERY
POV: guided room-to-room sequence, not carousel.
Movement: user selects Kitchen / Suite / Bath / Terrace; each reveal maintains house orientation.
Destination: confidence that this is one coherent property.
Transition: match cut on material, doorway or glazing.

LOCATION
POV: zoom out from property feeling to verified context.
Movement: map/context only when real data exists.
Destination: situate the property.
Concept fallback: non-claiming context frame + concept disclosure.

PRIVATE VIEWING
POV: still.
Movement: none except subtle living media.
Destination: one action.
CTA in concept: Ask about a listing.
CTA in real client build: supplied contact/viewing path.

### COLUMBUS 01 — EDITORIAL treatment
ARRIVAL
POV: curb / street-facing recognition.
Movement: restrained push.
Destination: “I know this house.”

ENTRY
POV: walk to front door.
Movement: direct, practical.
Transition: door mask.

GREAT ROOM
POV: room-scale understanding.
Movement: gentle depth shift; optional factual callout if supplied.
Destination: orientation, not spectacle.

KITCHEN / SUITE / BATH / BACKYARD
POV: room sequence with useful pauses.
Movement: direct scene cuts or short architectural match transitions.
Destination: practical buyer questions answered visually.
No hover-only controls.

PROPERTY FACTS
Real build only: price/beds/baths/sqft/MLS link from supplied verified data.
Concept build: explanatory placeholder showing where facts would appear, never fake numbers.

NEIGHBORHOOD
Real build only: agent-supplied verified context.
Concept build: generic context with explicit concept label.

PRIVATE SHOWING
One action. Agent/contact fields are absent in concept builds.

## Conversion path
Persistent but quiet:
- Back / scene index
- Facts (when real)
- Gallery
- Contact / viewing CTA
The cinematic introduction is skippable. Direct links can open gallery/facts without replaying arrival.

## Mobile
390 / 430px:
- swipe up/left or explicit tap advances one scene
- no desktop camera shrink-down
- keep subject focal points center-safe
- copy max ~4 short lines before expand
- CTA fixed only when it does not cover media/content
- gallery tap targets >=44px
- no hover-only details

## Reduced motion
- replace camera pushes with crossfades
- portal transitions become quick opacity/mask cuts
- no autoplay parallax
- preserve scene order, copy, facts and CTA
- never hide information inside motion

## Loading budget
First interaction should not wait for all rooms.
Load:
1. hero poster
2. next transition frame
3. first interior
Defer the remaining gallery/location media.
Use responsive WebP/AVIF where supported and poster images before video.

## Measurement plan
Concept review:
- completed arrival-to-living sequence
- scene exits
- CTA click
- mobile completion
Real client:
- outbound listing click
- agent/contact CTA click
- gallery/facts usage
No ROI claim until measured on real client traffic.
