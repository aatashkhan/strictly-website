# Google OAuth Consent Screen Setup

## Updating the App Name & Branding

The Google OAuth consent screen is what users see when they sign in with Google. To update the display name, logo, and other branding:

### Step-by-step

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project from the dropdown at the top
3. Navigate to **APIs & Services** > **OAuth consent screen** (left sidebar)
4. Click **Edit App** at the top of the page

### Fields to update

| Field | What to set |
|---|---|
| **App name** | Strictly The Good Stuff |
| **User support email** | denna@strictlythegoodstuff.com |
| **App logo** | Upload your logo (must be under 1MB, square recommended) |
| **App home page** | https://strictlythegoodstuff.com |
| **App privacy policy** | https://strictlythegoodstuff.com/privacy (create this page first) |
| **App terms of service** | https://strictlythegoodstuff.com/terms (create this page first) |
| **Authorized domains** | strictlythegoodstuff.com |
| **Developer contact email** | your developer email |

5. Click **Save and Continue** through each step
6. On the **Scopes** step, ensure you have:
   - `openid`
   - `email`
   - `profile`
7. Click **Save and Continue** to finish

### Publishing Status

- **Testing** mode: Only test users you manually add can sign in (max 100)
- **In production** mode: Anyone with a Google account can sign in

To move from Testing to Production:
1. Go to the OAuth consent screen page
2. Click **Publish App**
3. Google may require verification if you use sensitive scopes (email/profile are not sensitive, so this is usually instant)

### Supabase Configuration

Make sure your Google OAuth credentials are configured in Supabase:

1. Go to Supabase Dashboard > **Authentication** > **Providers** > **Google**
2. Enter your **Client ID** and **Client Secret** from Google Cloud Console
3. The redirect URL should be: `https://<your-project>.supabase.co/auth/v1/callback`
4. Add this same redirect URL in Google Cloud Console under **APIs & Services** > **Credentials** > your OAuth 2.0 Client > **Authorized redirect URIs**
