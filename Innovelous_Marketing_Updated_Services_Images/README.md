## Latest update: services and projects dashboard

**Existing database:** Run `migrations/2026-11-admin-services-projects.sql` in your Supabase SQL Editor. Do not rerun the full schema or older migrations on an existing database: older scripts contain sample content updates.

Deploy the updated `public/` or `dist/` directory as a complete unit. Both are synchronized. Keep your existing Supabase project and admin account; `config.js` is unchanged. No live database changes have been applied by this ZIP.

- Services: add, edit, delete, description, upload/replace/remove image, display order and Show/Hide.
- Projects: add, edit, delete, title, category, optional date, description, image, optional URL, display order and Show/Hide.
- Lower display order appears first (1 before 2). Ties use creation time then ID. New records default to the next order.
- Save the form after selecting or removing an image. PNG/JPG/WEBP/AVIF up to 8 MB. Existing images are retained in Storage when records are deleted or images replaced, so shared images are not accidentally deleted.
- Hidden items remain editable in the dashboard. Successful empty database results no longer bring back sample services. All published services appear, including items after the fifth.
- Project dates are stored and editable in the dashboard, but remain hidden on the public site as requested.
- Homepage headline and supporting copy saved in Website content now remain visible while hero images rotate.
- Refresh the public website after saving. The logo beside the contact form uses the supplied logo.

### Validation
JavaScript syntax and mocked dashboard/public-site regression checks are included. Live authenticated writes and the SQL migration still need to run in your Supabase project; no admin credentials are included.

---

# Innovelous Marketing

Static marketing site and admin dashboard for the Marketing Novelus subdomain. The frontend uses the public Supabase JS client; all write and admin access is enforced by Supabase Row Level Security.

## Supabase setup

1. Create a Supabase project and run `supabase/schema.sql` in its SQL Editor.
2. In Supabase Authentication, create the first dashboard user (disable public sign-ups after creating the account).
3. Copy that user's UUID from Authentication and run the final `marketing_admins` insert in the SQL file with the UUID.
4. Open `/dashboard/`, choose **Connect a Supabase project**, the Project URL and publishable key are preconfigured in `public/config.js`; run the schema and create the admin user before signing in. The key is intentionally public; never use a `service_role` key in a browser.
5. For public visitors to load CMS content and submit enquiries, set the same URL and publishable key in `public/config.js` before deployment. The dashboard can also store credentials in that browser's local storage, but that local setting does not apply to other visitors.

The site includes example service and project copy until you replace it with approved business content. The visual project cards are illustrative.

## Purple homepage and projects update
The homepage now uses five supplied Innovelous campaign visuals with rotating controls. Each slide has matching marketing copy, a dark blurred left-side text area, and a full-bleed image composition. Projects are managed in the admin dashboard and can be published or kept as drafts. The existing `case_studies` table remains the storage table for compatibility.

For an existing Supabase database, run `migrations/2026-11-purple-home-project-images.sql` in the SQL Editor once. The full schema at `supabase/schema.sql` also includes the project image field and updated homepage defaults.

Project records support a category, public image URL, project link, summary, display order, and publish status. The main site derives category filters from published projects and shows a useful empty state until real project records are published.

The project listing intentionally does not ship fabricated case studies. Until real work is added and published in the dashboard, visitors see a clear empty state. Project categories are used to build filters automatically.


Project images can be added by drag-and-drop or file selection in the dashboard (PNG, JPG, WEBP, AVIF, maximum 8 MB). The first save uploads the image to the `project-images` Supabase Storage bucket. Project link is optional: cards without a link display as a non-clickable preview and still appear when published. The included migration configures the bucket and its public-read/admin-write policies.
