-- Stage 10: Site Content CMS
-- Run this in Supabase SQL Editor

-- 10A: Create the site_content table
CREATE TABLE IF NOT EXISTS site_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  value_type TEXT DEFAULT 'text',
  label TEXT,
  helper_text TEXT,
  display_order INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(section, key)
);

-- RLS
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read site_content" ON site_content FOR SELECT USING (true);
CREATE POLICY "Admin write site_content" ON site_content FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Auto-update timestamp
CREATE TRIGGER site_content_updated_at BEFORE UPDATE ON site_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 10B: Seed all hardcoded content
INSERT INTO site_content (section, key, value, value_type, label, helper_text, display_order) VALUES
-- Hero section
('hero', 'headline', 'Your next favorite place is waiting.', 'text', 'Main Headline', 'The big text visitors see first on the homepage.', 1),
('hero', 'subtitle', 'Curated city guides, restaurant picks, and travel itineraries — all personally tested and approved.', 'text', 'Subtitle', 'Smaller text below the headline.', 2),
('hero', 'cta_text', 'Plan My Trip →', 'text', 'Button Text', 'The main call-to-action button on the homepage.', 3),
('hero', 'scrolling_cities', 'Paris,Rome,Tokyo,London,Seoul,Copenhagen,Los Angeles,New York City,Barcelona,Lisbon,Tulum,Amalfi', 'list', 'Scrolling Cities', 'City names that scroll across the hero. Comma-separated.', 4),

-- Homepage cards
('homepage', 'card_1_heading', 'Your Trip, Curated', 'text', 'Card 1 Heading', 'First feature card on homepage.', 1),
('homepage', 'card_1_description', 'Get a personalized day-by-day itinerary from Denna''s tested picks.', 'text', 'Card 1 Description', '', 2),
('homepage', 'card_1_cta', 'Plan My Trip →', 'text', 'Card 1 Button Text', '', 3),
('homepage', 'card_1_url', '/concierge', 'url', 'Card 1 Link', '', 4),
('homepage', 'card_2_heading', 'Read the Guides', 'text', 'Card 2 Heading', '', 5),
('homepage', 'card_2_description', 'Deep-dive city guides, hotel reviews, and the weekly Strict List.', 'text', 'Card 2 Description', '', 6),
('homepage', 'card_2_cta', 'Visit Substack →', 'text', 'Card 2 Button Text', '', 7),
('homepage', 'card_2_url', 'https://strictlythegoodstuff.substack.com', 'url', 'Card 2 Link', '', 8),
('homepage', 'card_3_heading', 'Shop My Picks', 'text', 'Card 3 Heading', '', 9),
('homepage', 'card_3_description', 'Outfit inspiration, collabs, and the things I''m obsessed with right now.', 'text', 'Card 3 Description', '', 10),
('homepage', 'card_3_cta', 'Shop Now →', 'text', 'Card 3 Button Text', '', 11),
('homepage', 'card_3_url', '/shop', 'url', 'Card 3 Link', '', 12),

-- Homepage bio
('homepage', 'bio_label', 'Who is Strictly?', 'text', 'Bio Section Label', 'Small caps label above bio.', 13),
('homepage', 'bio_heading', 'Hi, I''m Denna.', 'text', 'Bio Heading', '', 14),
('homepage', 'bio_text', 'I''m a travel and lifestyle curator on a permanent mission to find the good stuff — the restaurants worth the wait, the hotels that get every detail right, the hidden shops that make a city feel like yours. I share it all on my Substack (25K+ subscribers and counting!) and now, through Strictly Concierge, I can plan your trip for you.', 'richtext', 'Bio Text', 'The "Who is Strictly" paragraph on the homepage.', 15),
('homepage', 'bio_link_text', 'Read more about Strictly →', 'text', 'Bio Link Text', '', 16),

-- Homepage shop section
('homepage', 'shop_label', 'The Shop', 'text', 'Shop Section Label', '', 17),
('homepage', 'shop_heading', 'Curated picks, collabs & the things I''m obsessed with', 'text', 'Shop Heading', '', 18),
('homepage', 'shop_description', 'From outfit inspiration to sold-out hat drops to Daily Show collabs — shop the things I actually use and love.', 'text', 'Shop Description', '', 19),
('homepage', 'shop_cta', 'Shop Now', 'text', 'Shop Button Text', '', 20),

-- Featured cities
('homepage', 'featured_cities', 'Paris,Rome,Tokyo,London,Seoul,Copenhagen,Los Angeles,New York City', 'list', 'Featured Cities', 'Cities shown in the homepage grid. Comma-separated, must match city names exactly.', 21),

-- About page
('about', 'bio_paragraph_1', 'I started Strictly the Good Stuff because I was tired of generic recommendations. Every time I traveled, I''d spend hours digging through reviews, DMs, and blog posts trying to find the places that were actually worth it — not just the popular ones, but the ones that made you feel something.', 'richtext', 'Bio Paragraph 1', '', 1),
('about', 'bio_paragraph_2', 'So I started keeping lists. Obsessively detailed, highly opinionated lists of every restaurant, hotel, coffee shop, and hidden gem I discovered. Then I started sharing them on Substack, and something clicked — 25,000+ subscribers later, Strictly the Good Stuff has become a trusted source for people who want curated, personal recommendations over algorithm-driven noise.', 'richtext', 'Bio Paragraph 2', '', 2),
('about', 'bio_paragraph_3', 'My philosophy is simple: I only recommend places I''ve personally been to, tested, and loved. No sponsored placements. No paid reviews. Just the good stuff — strictly.', 'richtext', 'Bio Paragraph 3', '', 3),
('about', 'bio_paragraph_4', 'With Strictly Concierge, I''m taking it a step further. Now you can tell me where you''re going, what you love, and who you''re traveling with — and I''ll build you a personalized day-by-day itinerary from my tested picks. It''s like having me in your pocket, planning your trip.', 'richtext', 'Bio Paragraph 4', '', 4),
('about', 'philosophy_1_title', 'Curation over aggregation', 'text', 'Philosophy Card 1 Title', '', 5),
('about', 'philosophy_1_text', 'I don''t scrape the internet for reviews. Every single recommendation comes from personal experience. If I haven''t been there, it''s not on the list.', 'text', 'Philosophy Card 1 Text', '', 6),
('about', 'philosophy_2_title', 'Taste over trends', 'text', 'Philosophy Card 2 Title', '', 7),
('about', 'philosophy_2_text', 'I''m not chasing what''s viral. I''m sharing what''s genuinely good — the places I''d send my best friend to without hesitation.', 'text', 'Philosophy Card 2 Text', '', 8),
('about', 'philosophy_3_title', 'Honesty, always', 'text', 'Philosophy Card 3 Title', '', 9),
('about', 'philosophy_3_text', 'If something isn''t worth it, I''ll tell you. If the line is long but the food is life-changing, I''ll tell you that too. No fluff, no filler.', 'text', 'Philosophy Card 3 Text', '', 10),
('about', 'stat_cities', '28', 'number', 'Cities Covered', 'The number shown in the stats bar.', 11),
('about', 'stat_venues', '1,500+', 'text', 'Venues Curated', '', 12),
('about', 'stat_subscribers', '25K+', 'text', 'Subscribers', '', 13),
('about', 'stat_guides', '117', 'text', 'Guides Published', '', 14),

-- Footer
('footer', 'signup_heading', 'Get the good stuff in your inbox', 'text', 'Email Signup Heading', '', 1),
('footer', 'contact_email', 'denna@strictlythegoodstuff.com', 'text', 'Contact Email', '', 2),
('footer', 'instagram_url', '#', 'url', 'Instagram Link', '', 3),
('footer', 'tiktok_url', '#', 'url', 'TikTok Link', '', 4),
('footer', 'pinterest_url', '#', 'url', 'Pinterest Link', '', 5),

-- Concierge taglines (stored as one big comma-separated list)
('concierge', 'taglines', 'Checking in?,Bon voyage babe.,Where to next?,Pack your bags.,The good stuff awaits.,Adventure curated.,Let''s plan something great.,Ready when you are.,Your trip starts here.,Grab your passport.,Time to explore.,Strictly the best.,Window or aisle?,Wheels up.,New city who dis?,Boarding now.,Passport stamp incoming.,Takeoff in 3 2 1…,Jet lag is a vibe.,Touch down let''s go.,Next stop: magic.,Off the beaten path.,Only the good stuff.,Trust the list.,Denna-approved.,Strictly curated.,The strict list awaits.,Vetted and obsessed.,I know a place.,You''re in good hands.,Consider this handled.,Leave the planning to me.', 'list', 'Rotating Taglines', 'Phrases that rotate above "Strictly Concierge". Comma-separated.', 1),

-- AI Voice
('ai_voice', 'personality', 'Warm, knowledgeable friend with great taste — conversational but not over-the-top', 'richtext', 'AI Personality Description', 'How the AI version of you sounds. This shapes the tone of every itinerary.', 1),
('ai_voice', 'signature_words', 'strict,strictest,good stuff,grab,bask,chic,honestly,truly', 'list', 'Words to Use', 'Words and phrases the AI should use naturally. Comma-separated.', 2),
('ai_voice', 'words_to_avoid', '', 'list', 'Words to Avoid', 'Words the AI should never use. Comma-separated.', 3),
('ai_voice', 'exclamation_level', 'moderate', 'text', 'Exclamation Level', 'How enthusiastic: "restrained" (almost none), "moderate" (occasional), "enthusiastic" (frequent).', 4),
('ai_voice', 'obsessed_frequency', 'sparingly', 'text', '"Obsessed" Usage', '"never", "sparingly" (1-2 per itinerary), or "freely"', 5),
('ai_voice', 'example_phrases', 'this place is really special,honestly the best I''ve had,line is long but worth it', 'list', 'Example Phrases', 'Phrases that sound like you. The AI uses these as tone references.', 6),
('ai_voice', 'signoff', 'xo', 'text', 'Sign-off', 'How the AI signs off every itinerary.', 7),

-- Email template
('email', 'header_text', 'Your Strict Itinerary', 'text', 'Email Header', 'The title at the top of the itinerary email.', 1),
('email', 'footer_text', 'Every recommendation personally tested & approved by Denna', 'text', 'Email Footer', 'The text at the bottom of the itinerary email.', 2)

ON CONFLICT (section, key) DO NOTHING;
