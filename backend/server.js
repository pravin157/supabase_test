import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createAdminClient } from '@supabase/server/core';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env or root ../.env
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Supabase admin client using @supabase/server
// Automatically reads SUPABASE_URL and SUPABASE_SECRET_KEY / SUPABASE_SECRET_KEYS from environment
const supabase = createAdminClient();

// Ensure the storage bucket exists
async function ensureBucket() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const hasAvatars = buckets?.some(b => b.name === 'avatars');
    if (!hasAvatars) {
      await supabase.storage.createBucket('avatars', { public: true });
      console.log('✓ Created "avatars" storage bucket in Supabase');
    } else {
      console.log('✓ Supabase "avatars" storage bucket is ready');
    }
  } catch (err) {
    console.warn('Notice when verifying storage bucket:', err.message);
  }
}

ensureBucket();

const app = new Hono();

// Enable CORS
app.use('*', cors());

// Health check endpoint
app.get('/api/health', async (c) => {
  try {
    const { error: dbError } = await supabase.from('profiles').select('id').limit(1);
    const tableReady = !dbError || dbError.code !== 'PGRST205';

    return c.json({
      status: 'ok',
      supabaseConnected: true,
      profilesTableReady: tableReady,
      hint: tableReady
        ? 'Database is configured and ready.'
        : 'Please execute the schema.sql in your Supabase SQL Editor to create the profiles table.'
    });
  } catch (err) {
    return c.json({
      status: 'error',
      message: err.message
    }, 500);
  }
});

// Create/Upload profile
app.post('/api/profile', async (c) => {
  try {
    const body = await c.req.json();
    const { firstName, lastName, avatarBase64 } = body;

    if (!firstName || !firstName.trim()) {
      return c.json({ success: false, error: 'First name is required.' }, 400);
    }
    if (!lastName || !lastName.trim()) {
      return c.json({ success: false, error: 'Last name is required.' }, 400);
    }

    let avatarUrl = null;

    // Upload avatar to Supabase Storage if provided
    if (avatarBase64 && avatarBase64.startsWith('data:image/')) {
      const matches = avatarBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1].replace('jpeg', 'jpg');
        const buffer = Buffer.from(matches[2], 'base64');
        const fileName = `avatar-${Date.now()}-${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, buffer, {
            contentType: `image/${matches[1]}`,
            upsert: true
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          return c.json({
            success: false,
            error: `Failed to upload avatar image: ${uploadError.message}`
          }, 500);
        }

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = publicUrlData?.publicUrl || null;
      }
    }

    // Save profile to Supabase Database
    const { data: insertedData, error: insertError } = await supabase
      .from('profiles')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        avatar_url: avatarUrl
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);

      // If the profiles table hasn't been created in Supabase yet
      if (insertError.code === 'PGRST205') {
        return c.json({
          success: false,
          needsSchemaMigration: true,
          error: "Table 'profiles' does not exist yet. Please run the provided 'schema.sql' in your Supabase SQL Editor.",
          uploadedAvatarUrl: avatarUrl
        }, 400);
      }

      return c.json({
        success: false,
        error: `Database error: ${insertError.message}`
      }, 500);
    }

    return c.json({
      success: true,
      message: 'Profile created successfully in Supabase!',
      profile: {
        id: insertedData.id,
        firstName: insertedData.first_name,
        lastName: insertedData.last_name,
        avatarUrl: insertedData.avatar_url,
        createdAt: insertedData.created_at
      }
    });

  } catch (err) {
    console.error('Server error handling profile:', err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Get recent profiles
app.get('/api/profiles', async (c) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, profiles: data });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Serve frontend static assets from parent directory
const clientDir = path.resolve(__dirname, '..');
app.use('/*', serveStatic({ root: path.relative(process.cwd(), clientDir) || './' }));

const PORT = process.env.PORT || 3000;
console.log(`Backend server starting on http://localhost:${PORT}`);

serve({
  fetch: app.fetch,
  port: Number(PORT)
});
