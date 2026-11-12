-- Client assets folder: where the logo, photo and testimonial upload steps send the client.
-- Optional; when empty those steps open the main Drive folder instead.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assets_folder_url TEXT;
