# Admin Panel Setup

## Prerequisites
- Supabase project with the schema from `scripts/001-schema.sql` applied
- Venue data seeded via `scripts/seed-supabase.ts`

## Grant Admin Access

1. Sign in to the app at `/admin` using Google OAuth (this creates a Supabase auth user)
2. Find the user's UUID in Supabase Dashboard > Authentication > Users
3. Insert into the admin_users table:

```sql
INSERT INTO admin_users (id, email, role)
VALUES ('the-user-uuid-here', 'denna@email.com', 'admin');
```

## Image Upload (Optional)

To enable venue/city image uploads:

1. In Supabase Dashboard, go to Storage
2. Create a new bucket called `venue-images`
3. Set it to **Public** (so images can be served directly)
4. Add a storage policy allowing authenticated users to upload:

```sql
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'venue-images');
```

## Access

- Admin panel: `/admin`
- Only users in the `admin_users` table can access
- All admin API routes verify admin status on every request
