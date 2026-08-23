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

async function testBoothFlow() {
  console.log('Testing create booth & maybeSingle query...');
  const testCode = 'Q3XMJX';

  // 1. Query non-existent code with maybeSingle (should return null without 406 error)
  const { data: missingData, error: missingError } = await supabase
    .from('booths')
    .select('*')
    .eq('code', 'NON_EXISTENT_CODE_123')
    .maybeSingle();

  console.log('Non-existent code query test:', {
    data: missingData,
    error: missingError?.message || null,
    status: missingError ? 'Error' : '✅ Handled gracefully with null (no 406!)',
  });

  // 2. Insert booth with valid DB UUID
  const { data: createdBooth, error: createError } = await supabase
    .from('booths')
    .insert({
      code: testCode,
      host_name: 'Luna',
      status: 'waiting',
    })
    .select()
    .maybeSingle();

  if (createError) {
    console.error('Create error:', createError.message);
    return;
  }

  console.log('✅ Created booth in Supabase:', createdBooth);

  // 3. Query the booth by code
  const { data: queriedBooth, error: queryError } = await supabase
    .from('booths')
    .select('*')
    .eq('code', testCode)
    .maybeSingle();

  console.log('✅ Query booth by code result:', queriedBooth);

  // Clean up
  await supabase.from('booths').delete().eq('id', createdBooth.id);
  console.log('✅ Cleaned up test booth.');
}

testBoothFlow();
