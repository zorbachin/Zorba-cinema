# Builder Constitution — Zorba Cinema

Read this before editing.

## Mission
Build immersive, cinematic web experiences that can be sold, not conventional landing pages with animation.

The first product is Cinematic Listings. The property is the interface.

## Interaction principles
- Scene advancement over endless vertical scrolling.
- One wheel/swipe/tap may advance one composed scene.
- Movement can be forward, lateral, masked or spatial.
- Short transitions may auto-complete.
- Rhythm: MOVE → WATCH → INTERACT → QUIET → MOVE.
- Use visual match cuts and architectural lines to connect scenes.
- At least three moments per flagship demo should be worth screen-recording.
- Mobile gets its own choreography.
- Respect prefers-reduced-motion.

## Never default to
cards, SaaS feature grids, glassmorphism, generic realtor templates, fake testimonials, generic stock imagery, random AI luxury homes, skill bars, icon rows, gratuitous gradients.

## Asset order
Before inventing media:
1. Check ASSET-MANIFEST.md.
2. Check the property/project asset directory.
3. Prefer real supplied photography.
4. Prefer approved generated continuity assets.
5. Derive crops/frames where appropriate.
6. Only then use a clearly tagged placeholder.

Never fabricate clients, metrics, addresses, quotes, publications, historical facts or relationships.

## Cinematic Listings v1
Build a reusable engine whose content is property data, not hard-coded scene markup.

Required scene primitives:
- CinematicArrival
- Approach
- ArchitecturalPortal
- RoomReveal
- SpatialGallery
- PropertyFacts
- LocationStory
- AgentMoment
- ViewingCTA
- CommercialBreakout

First vertical slice: ARRIVAL → APPROACH → DOOR → LIVING → PRIVATE VIEWING. Make this exceptional before expanding.

## Product architecture
Two different properties must run through the same engine while feeling bespoke:
- 17 OCEAN: cinematic / aspirational / coastal.
- Columbus 01: editorial / residential / useful / neighborhood-oriented.

Later internal creator flow: photos + property data + agent branding → classify/order assets → choose treatment → preview → publish. Do not build auth/billing/admin bloat before the two prototypes prove the experience.

## Acceptance test
Could this section exist on 5,000 realtor templates? If yes, redesign.
Would a realtor with a valuable listing understand why this is worth ~$1k and want one? If no, improve.
