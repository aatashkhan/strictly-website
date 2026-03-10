# Data Audit: NYC & Ojai

## New York City — 24 venues

### Category breakdown
| Category | Count | Assessment |
|---|---|---|
| eat | 19 | Good coverage |
| drink | 5 | Decent |
| stay | 0 | **Missing entirely** |
| explore | 0 | **Missing entirely** |
| shop | 0 | **Missing entirely** |
| spa | 0 | **Missing entirely** |

### Recommendations
NYC is heavily food-focused with zero hotels, shops, activities, or spa/wellness spots. For a proper multi-day itinerary, Denna should add:
- **stay** (5-10): Hotels across price ranges (boutique, luxury, neighborhood picks)
- **explore** (5-10): Museums, parks, walks, neighborhoods to wander
- **shop** (3-5): Denna's favorite boutiques, vintage spots, bookstores
- **drink** (2-3 more): Cocktail bars, wine bars, rooftop spots
- **spa** (1-2): If relevant to her curation

### Data source
Original data comes from `src/data/venues.json`. No separate scraping scripts found — data was manually curated.

---

## Ojai — 18 venues

### Category breakdown
| Category | Count | Assessment |
|---|---|---|
| eat | 10 | Good for a small town |
| shop | 5 | Good |
| stay | 3 | Decent |
| drink | 0 | **Missing** |
| explore | 0 | **Missing** |
| spa | 0 | **Missing** (surprising for Ojai, known for wellness) |

### Recommendations
Ojai is a wellness/nature destination, so the gaps are notable:
- **spa** (2-3): Ojai is famous for spas — this is a major gap
- **explore** (3-5): Hikes, scenic drives, art galleries, meditation spots
- **drink** (2-3): Wine tasting, cocktail spots, craft beverage makers

---

## How to add venues

Use the Admin Panel (Admin > Venues > "+ Add Venue") or the AI Assistant chat for bulk operations. All new venues are automatically marked `needs_review: true` so they can be verified before going live.
