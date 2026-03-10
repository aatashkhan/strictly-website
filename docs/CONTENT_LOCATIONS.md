# Content Locations Guide

Every piece of user-facing text and where to find/edit it.

## Database-driven content (edit via Admin Panel)

| Content | Where it lives | How to edit |
|---|---|---|
| Venue descriptions | `venues.denna_note` column | Admin > Venues > click venue > Denna's Note |
| Venue details (name, category, neighborhood, address, etc.) | `venues` table | Admin > Venues > click venue |
| Venue images | `venues.image_url` + Supabase Storage | Admin > Venues > click venue > Image upload |
| City intros (shown in itinerary header) | `cities.denna_intro` column | Admin > City Settings > City Intro |
| City loading tips | `cities.loading_tips` column (JSON array) | Admin > City Settings > Loading Tips |
| City recommended transit | `cities.recommended_transit` column | Admin > City Settings > Transit |
| City custom vibes | `cities.custom_vibes` column (JSON array) | Admin > City Settings > Vibes |

## Hardcoded content (requires code change)

| Content | File | Line(s) | Notes |
|---|---|---|---|
| Rotating taglines ("Checking in?", etc.) | `src/data/taglines.ts` | all | 98 taglines, easy to add/remove |
| Loading phrases (generic) | `src/components/LoadingScreen.tsx` | `genericPhrases` array | Shown during itinerary generation |
| Hero headline | `src/components/Hero.tsx` | ~line 29 | "Your next favorite place is waiting" |
| Hero subtitle | `src/components/Hero.tsx` | ~line 33 | |
| Hero CTA button | `src/components/Hero.tsx` | ~line 41 | |
| Hero scrolling cities | `src/components/Hero.tsx` | lines 3-16 | City names in ticker |
| Three homepage cards | `src/components/ThreeCards.tsx` | lines 3-27 | Headings, descriptions, CTAs |
| "Who is Strictly" section | `src/app/page.tsx` | lines 23-38 | |
| "The Shop" section | `src/app/page.tsx` | lines 44-62 | |
| About page bio | `src/app/about/page.tsx` | lines 32-58 | |
| About page philosophy cards | `src/app/about/page.tsx` | lines 71-99 | |
| About page stats | `src/app/about/page.tsx` | lines 109-133 | "28 cities, 1500+ venues" etc. |
| Footer email signup heading | `src/components/Footer.tsx` | ~line 26 | |
| Footer social links | `src/components/Footer.tsx` | lines 5-9 | |
| Footer contact email | `src/components/Footer.tsx` | ~line 63 | |
| Nav links | `src/components/Nav.tsx` | lines 9-18 | |
| Featured cities list | `src/lib/constants.ts` | `FEATURED_CITIES` | Homepage grid |
| AI voice/personality | `src/lib/prompts.ts` | `buildSystemPrompt()` | Denna's tone, vocabulary, rules |
| Email template text | `src/app/api/send-itinerary/route.ts` | header/footer text | |

## Future: Stage 10 (Site Content CMS)

Stage 10 will move all hardcoded content above into a `site_content` database table, making everything editable from the admin panel without code changes.
