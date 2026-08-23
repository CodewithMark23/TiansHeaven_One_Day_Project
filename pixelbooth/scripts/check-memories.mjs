import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
let supabaseUrl = '';
let supabaseAnonKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = trimmed.replace('VITE_SUPABASE_URL=', '').trim();
    }
    if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = trimmed.replace('VITE_SUPABASE_ANON_KEY=', '').trim();
    }
  }
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkMemoriesTable() {
  console.log('Checking "memories" table in Supabase...');
  const testId = 'test_' + Date.now();
  const { data, error } = await supabase
    .from('memories')
    .insert({
      id: testId,
      image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      caption: 'Test Memory',
      frame: 'classic',
      frame_color: '#ffffff',
    })
    .select()
    .single();

  if (error) {
    console.log('Note on memories table:', error.message);
    if (error.code === '42P01') {
      console.log('👉 Please run the updated SQL in supabase/migrations/001_init.sql to create the memories table in Supabase SQL editor.');
    }
  } else {
    console.log('✅ "memories" table is active! Cleaned up test record.');
    await supabase.from('memories').delete().eq('id', testId);
  }
}

checkMemoriesTable();
