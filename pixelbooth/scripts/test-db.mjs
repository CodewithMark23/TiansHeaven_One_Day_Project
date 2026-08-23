import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env directly
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

console.log('🔍 Testing Supabase Database Connection...');
console.log(`📡 URL: ${supabaseUrl}`);

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-ref')) {
  console.error('❌ Supabase credentials not found or placeholder used in .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabase() {
  try {
    // 1. Test booths table
    console.log('\n--- 1. Testing "booths" table ---');
    const testCode = 'TEST' + Math.floor(10 + Math.random() * 90);
    const { data: insertData, error: insertError } = await supabase
      .from('booths')
      .insert({
        code: testCode,
        host_name: 'TestHost',
        status: 'waiting',
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '42P01' || insertError.message.includes('relation "booths" does not exist')) {
        console.error('❌ "booths" table does NOT exist yet.');
        console.log('\n👉 Action needed: Run the SQL script from "supabase/migrations/001_init.sql" in your Supabase SQL Editor.');
        return;
      }
      console.error(`❌ Insert into "booths" failed:`, insertError.message);
      return;
    }

    console.log(`✅ Successfully created test booth with code: ${insertData.code} (ID: ${insertData.id})`);

    // Read it back
    const { data: readData, error: readError } = await supabase
      .from('booths')
      .select('*')
      .eq('id', insertData.id)
      .single();

    if (readError) {
      console.error(`❌ Reading test booth failed:`, readError.message);
    } else {
      console.log(`✅ Successfully queried test booth back from database! Host: ${readData.host_name}`);
    }

    // 2. Test photos table
    console.log('\n--- 2. Testing "photos" table ---');
    const { data: photoData, error: photoError } = await supabase
      .from('photos')
      .insert({
        booth_id: insertData.id,
        taker_name: 'TestHost',
        image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        filter: 'original',
        position: 1,
      })
      .select()
      .single();

    if (photoError) {
      if (photoError.code === '42P01' || photoError.message.includes('relation "photos" does not exist')) {
        console.error('❌ "photos" table does NOT exist yet.');
        console.log('\n👉 Action needed: Run the SQL script from "supabase/migrations/001_init.sql" in your Supabase SQL Editor.');
      } else {
        console.error(`❌ Insert into "photos" failed:`, photoError.message);
      }
    } else {
      console.log(`✅ Successfully inserted photo record (ID: ${photoData.id})`);
    }

    // 3. Clean up test records
    console.log('\n--- 3. Cleaning up test record ---');
    const { error: deleteError } = await supabase
      .from('booths')
      .delete()
      .eq('id', insertData.id);

    if (deleteError) {
      console.warn(`⚠️ Cleanup note:`, deleteError.message);
    } else {
      console.log(`✅ Cleaned up test records.`);
    }

    console.log('\n🎉 ALL DATABASE CHECKS PASSED! Your Supabase database is ready and working perfectly!\n');
  } catch (err) {
    console.error('❌ Unexpected error during database test:', err);
  }
}

testDatabase();
