import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import type { ItineraryData, TripFormData } from "@/lib/types";
import { getCityData } from "@/lib/venues";

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

function buildEmailHtml(itinerary: ItineraryData, tripData: TripFormData): string {
  const cityData = getCityData(tripData.city);
  const venues = cityData?.venues ?? [];
  const venueMap = new Map(venues.map((v) => [v.id, v]));

  const daysHtml = itinerary.days
    .map((day) => {
      const itemsHtml = day.items
        .map((item) => {
          const venue = item.venueId ? venueMap.get(item.venueId) : undefined;
          const timeRange = item.endTime
            ? `${item.time} &ndash; ${item.endTime}`
            : item.time;

          const linksHtml: string[] = [];
          if (venue?.google_maps_url) {
            linksHtml.push(
              `<a href="${venue.google_maps_url}" style="color: #B8937A; text-decoration: none; font-size: 12px;">Google Maps &rarr;</a>`
            );
          }
          if (venue?.instagram) {
            const igUrl = venue.instagram.startsWith("http")
              ? venue.instagram
              : `https://instagram.com/${venue.instagram.replace("@", "")}`;
            linksHtml.push(
              `<a href="${igUrl}" style="color: #B8937A; text-decoration: none; font-size: 12px;">Instagram &rarr;</a>`
            );
          }
          if (venue?.website) {
            linksHtml.push(
              `<a href="${venue.website}" style="color: #B8937A; text-decoration: none; font-size: 12px;">Website &rarr;</a>`
            );
          }

          return `
            <tr>
              <td style="padding: 16px 0; border-bottom: 1px solid #EDE7E1;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="90" valign="top" style="padding-right: 16px;">
                      <span style="font-family: 'Roboto Mono', monospace; font-size: 13px; color: #B8937A; font-weight: 600;">${timeRange}</span>
                      ${item.duration ? `<br><span style="font-family: 'Roboto Mono', monospace; font-size: 11px; color: #7A6E66;">${item.duration} min</span>` : ""}
                    </td>
                    <td valign="top">
                      <span style="font-family: 'Roboto Mono', monospace; font-size: 16px; color: #2C2420; font-weight: 600;">${item.name}</span>
                      ${item.address ? `<br><span style="font-family: 'Roboto Mono', monospace; font-size: 11px; color: #7A6E66;">${item.address}</span>` : ""}
                      <br><span style="font-family: 'Roboto Mono', monospace; font-size: 13px; color: #7A6E66; line-height: 1.6;">${item.note}</span>
                      ${linksHtml.length > 0 ? `<br><div style="margin-top: 8px;">${linksHtml.join(" &nbsp;&middot;&nbsp; ")}</div>` : ""}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`;
        })
        .join("");

      return `
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 32px;">
          <tr>
            <td style="background: #F5F0EB; padding: 16px 20px; border-radius: 12px;">
              <span style="font-family: 'Roboto Mono', monospace; font-size: 11px; color: #B8937A; text-transform: uppercase; letter-spacing: 3px;">Day ${day.day}</span>
              <br><span style="font-family: 'Roboto Mono', monospace; font-size: 20px; color: #2C2420; font-weight: 700;">${day.title}</span>
            </td>
          </tr>
          ${itemsHtml}
        </table>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F4; font-family: 'Roboto Mono', monospace;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FAF7F4;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <span style="font-family: 'Roboto Mono', monospace; font-size: 28px; color: #2C2420; font-weight: 300; letter-spacing: -1px;">strictly</span>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td align="center" style="padding-bottom: 8px;">
              <span style="font-family: 'Roboto Mono', monospace; font-size: 11px; color: #B8937A; text-transform: uppercase; letter-spacing: 4px;">Your Strict Itinerary</span>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 12px;">
              <span style="font-family: 'Roboto Mono', monospace; font-size: 32px; color: #2C2420; font-weight: 700;">Strictly ${tripData.city}</span>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <span style="font-family: 'Roboto Mono', monospace; font-size: 13px; color: #7A6E66;">${tripData.duration} nights &middot; ${tripData.companions} &middot; ${tripData.vibes.join(", ")}</span>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td align="center" style="padding: 0 24px 40px;">
              <span style="font-family: 'Roboto Mono', monospace; font-size: 14px; color: #7A6E66; line-height: 1.7;">${itinerary.intro}</span>
            </td>
          </tr>

          <!-- Days -->
          <tr>
            <td>
              ${daysHtml}
            </td>
          </tr>

          <!-- Signoff -->
          <tr>
            <td align="center" style="padding: 24px 0 40px;">
              <span style="font-family: 'Roboto Mono', monospace; font-size: 16px; color: #B8937A; line-height: 1.6;">${itinerary.signoff}</span>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 0; border-top: 1px solid #EDE7E1;">
              <span style="font-family: 'Roboto Mono', monospace; font-size: 11px; color: #7A6E66;">Every recommendation personally tested & approved by Denna</span>
              <br><br>
              <a href="https://strictlythegoodstuff.substack.com" style="font-family: 'Roboto Mono', monospace; font-size: 11px; color: #B8937A; text-decoration: none;">strictlythegoodstuff.substack.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const { email, itinerary, tripData } = (await request.json()) as {
      email: string;
      itinerary: ItineraryData;
      tripData: TripFormData;
    };

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const resend = getResend();
    if (!resend) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    const html = buildEmailHtml(itinerary, tripData);

    await resend.emails.send({
      from: "Strictly Concierge <concierge@strictlythegoodstuff.com>",
      to: email,
      subject: `Your Strictly ${tripData.city} Itinerary`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending itinerary email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
