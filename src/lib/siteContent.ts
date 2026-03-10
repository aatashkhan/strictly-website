import { createServerSupabase } from "./supabase";

/**
 * Fetch all site_content rows for a given section.
 * Returns a Record<key, value> for easy access.
 */
export async function getSiteContent(section: string): Promise<Record<string, string>> {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("site_content")
    .select("key, value")
    .eq("section", section)
    .order("display_order");

  const result: Record<string, string> = {};
  for (const row of data ?? []) {
    result[row.key] = row.value;
  }
  return result;
}

/** Parse a comma-separated list value into an array */
export function parseList(value: string): string[] {
  return value.split(",").map(s => s.trim()).filter(Boolean);
}
