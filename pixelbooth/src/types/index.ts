// Core types for PixelBooth application

export type FilterType =
  | 'none'
  | 'grayscale'
  | 'sepia'
  | 'vivid'
  | 'warm'
  | 'cool'
  | 'dreamy';

export interface FilterOption {
  id: FilterType;
  label: string;
  cssFilter: string;
  overlay?: string; // optional color overlay
}

export interface Sticker {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface CapturedPhoto {
  id: string;
  dataUrl: string;
  filter: FilterType;
  stickers: Sticker[];
  takerName: string;
  position: number; // 1–4
  timestamp: number;
}

export type BoothMode = 'solo' | 'ldr';
export type BoothStatus = 'waiting' | 'active' | 'capturing' | 'done';

export interface BoothSession {
  id: string;
  code: string;
  hostName: string;
  guestName?: string;
  status: BoothStatus;
  photos: CapturedPhoto[];
  createdAt: string;
}

export interface LDRRealtimeEvent {
  type:
    | 'PARTNER_JOINED'
    | 'PHOTO_TAKEN'
    | 'COUNTDOWN_START'
    | 'FLASH'
    | 'STRIP_READY';
  payload?: Record<string, unknown>;
}

export interface StripOptions {
  borderColor: string;
  title?: string;
  date?: boolean;
  layout: 'vertical' | 'grid';
}

export const FILTER_OPTIONS: FilterOption[] = [
  { id: 'none', label: 'Original', cssFilter: 'none' },
  { id: 'grayscale', label: 'B&W', cssFilter: 'grayscale(100%)' },
  { id: 'sepia', label: 'Sepia', cssFilter: 'sepia(80%)' },
  { id: 'vivid', label: 'Vivid', cssFilter: 'saturate(180%) contrast(110%)' },
  {
    id: 'warm',
    label: 'Warm',
    cssFilter: 'sepia(30%) saturate(140%) brightness(105%)',
  },
  {
    id: 'cool',
    label: 'Cool',
    cssFilter: 'hue-rotate(200deg) saturate(120%) brightness(105%)',
  },
  {
    id: 'dreamy',
    label: 'Dreamy',
    cssFilter: 'brightness(110%) contrast(90%) saturate(120%) blur(0.3px)',
  },
];

export const STICKER_EMOJIS = [
  '🌸', '🌷', '✨', '💫', '⭐', '🦋', '🎀', '💕',
  '🩷', '🎶', '🌈', '🍒', '🍓', '🌙', '☁️', '🌟',
  '💝', '🥰', '🌺', '🫧', '🎠', '🎡', '🪷', '💐',
];

export const STRIP_BORDER_COLORS = [
  '#FFB6C1', // pink blush
  '#C9B1FF', // lavender
  '#B5EAD7', // mint
  '#FFDAC1', // peach
  '#AED9E0', // sky soft
  '#FFFFFF', // white
  '#3D3D3D', // dark
  '#FFE4E1', // misty rose
];
