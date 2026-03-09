import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabase(token);

  const { data, error } = await supabase
    .from("trips")
    .select("id, share_token")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const origin = request.headers.get("origin") || "https://strictly-website.vercel.app";
  const shareUrl = `${origin}/trips/${data.id}/shared?token=${data.share_token}`;

  return NextResponse.json({ shareUrl, shareToken: data.share_token });
}
