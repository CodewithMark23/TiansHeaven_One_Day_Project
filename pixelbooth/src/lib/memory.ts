import QRCode from 'qrcode';
import { supabase, hasSupabaseConfig } from './supabase';
import { nanoid } from 'nanoid';

export interface MemoryData {
  id: string;
  imageUrl: string;
  caption?: string;
  frame?: string;
  frameColor?: string;
  createdAt: string;
}

const LOCAL_STORAGE_KEY_PREFIX = 'snappy_memory_';

/**
 * Uploads or saves a memory (photo strip + metadata) and returns the memory ID + share URL.
 */
export async function saveMemory(
  imageDataUrl: string,
  metadata?: {
    caption?: string;
    frame?: string;
    frameColor?: string;
  }
): Promise<{ id: string; url: string }> {
  const id = nanoid(10);
  const createdAt = new Date().toISOString();
  let uploadedImageUrl = imageDataUrl;

  // 1. Try uploading to Supabase Storage 'photos' bucket if available
  if (hasSupabaseConfig) {
    try {
      // Convert base64 dataUrl to blob
      const res = await fetch(imageDataUrl);
      const blob = await res.blob();
      const fileName = `strips/${id}.png`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true,
        });

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);

        if (publicUrlData?.publicUrl) {
          uploadedImageUrl = publicUrlData.publicUrl;
        }
      }
    } catch (err) {
      console.warn('Storage upload note (using base64 fallback):', err);
    }

    // 2. Try inserting into Supabase 'memories' table
    try {
      await supabase.from('memories').insert({
        id,
        image_url: uploadedImageUrl,
        caption: metadata?.caption || null,
        frame: metadata?.frame || null,
        frame_color: metadata?.frameColor || null,
        created_at: createdAt,
      });
    } catch (err) {
      console.warn('Supabase memories insert note:', err);
    }
  }

  // 3. Always save in localStorage for fast local/offline access
  const memoryObj: MemoryData = {
    id,
    imageUrl: uploadedImageUrl,
    caption: metadata?.caption,
    frame: metadata?.frame,
    frameColor: metadata?.frameColor,
    createdAt,
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + id, JSON.stringify(memoryObj));
  } catch (err) {
    console.warn('localStorage save note:', err);
  }

  // Generate public memory URL
  const origin = window.location.origin;
  const url = `${origin}/memory/${id}`;

  return { id, url };
}

/**
 * Fetches a memory by ID (from Supabase or localStorage).
 */
export async function getMemory(id: string): Promise<MemoryData | null> {
  // 1. Check Supabase first
  if (hasSupabaseConfig) {
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          imageUrl: data.image_url,
          caption: data.caption,
          frame: data.frame,
          frameColor: data.frame_color,
          createdAt: data.created_at,
        };
      }
    } catch (err) {
      console.warn('Supabase fetch note:', err);
    }
  }

  // 2. Fallback to localStorage
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + id);
    if (local) {
      return JSON.parse(local) as MemoryData;
    }
  } catch (err) {
    console.warn('localStorage read error:', err);
  }

  return null;
}

/**
 * Generates a cute QR Code data URL with customized pastel styling.
 */
export async function generateQRCode(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 320,
    margin: 2,
    color: {
      dark: '#C0304F',    // Deep cute snappy pink
      light: '#FFF9F0',   // Cream snappy background
    },
    errorCorrectionLevel: 'M',
  });
}
