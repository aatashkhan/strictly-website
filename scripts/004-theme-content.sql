-- Stage: Theme settings in site_content
-- Run this in Supabase SQL Editor

INSERT INTO site_content (section, key, value, value_type, label, helper_text, display_order) VALUES
-- Dark theme colors (default)
('theme', 'color_bg', '57 33 24', 'color', 'Background', 'Main page background color.', 1),
('theme', 'color_text', '235 233 232', 'color', 'Text', 'Primary text color.', 2),
('theme', 'color_accent', '247 55 24', 'color', 'Accent', 'Buttons, links, and highlights.', 3),
('theme', 'color_secondary', '168 158 152', 'color', 'Secondary Text', 'Subtitles and secondary info.', 4),
('theme', 'color_muted', '122 114 110', 'color', 'Muted Text', 'Placeholders and labels.', 5),
('theme', 'color_border', '85 58 46', 'color', 'Borders', 'Card and input borders.', 6),
('theme', 'color_surface', '69 48 31', 'color', 'Surface / Cards', 'Card and panel backgrounds.', 7),
('theme', 'color_eat', '196 112 90', 'color', 'Eat Category', 'Color for restaurant venues.', 8),
('theme', 'color_stay', '90 112 196', 'color', 'Stay Category', 'Color for hotel venues.', 9),
('theme', 'color_explore', '90 196 112', 'color', 'Explore Category', 'Color for explore venues.', 10),
('theme', 'color_shop', '196 90 180', 'color', 'Shop Category', 'Color for shop venues.', 11),
('theme', 'color_drink', '196 152 90', 'color', 'Drink Category', 'Color for drink venues.', 12),
('theme', 'color_spa', '196 180 90', 'color', 'Spa Category', 'Color for spa venues.', 13),
-- Fonts
('theme', 'font_body', 'Roboto Mono', 'text', 'Body Font', 'Main UI and body text font.', 14),
('theme', 'font_heading', 'Cormorant Garamond', 'text', 'Heading Font', 'Font for headings and titles.', 15)

ON CONFLICT (section, key) DO NOTHING;
