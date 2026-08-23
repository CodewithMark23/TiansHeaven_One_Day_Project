// ─── Core enums & scalars ─────────────────────────────────────────────────────

export type FilterType =
  | 'original'
  | 'bright'
  | 'soft'
  | 'warm'
  | 'cool'
  | 'vintage'
  | 'grayscale'
  | 'pink'
  | 'dreamy'
  | 'y2k';

export type CountdownDuration = 3 | 5 | 10;
export type PhotoCount = 1 | 3 | 4 | 6;

// ─── Filter options ────────────────────────────────────────────────────────────

export interface FilterOption {
  id: FilterType;
  label: string;
  cssFilter: string;
  overlayColor?: string; // rgba overlay for tints
  emoji: string;
}

export const FILTER_OPTIONS: FilterOption[] = [
  { id: 'original', label: 'Original', cssFilter: 'none', emoji: '✨' },
  { id: 'bright',   label: 'Bright',   cssFilter: 'brightness(130%) contrast(105%) saturate(110%)', emoji: '☀️' },
  { id: 'soft',     label: 'Soft',     cssFilter: 'brightness(110%) contrast(90%) saturate(80%) blur(0.3px)', emoji: '🌸' },
  { id: 'warm',     label: 'Warm',     cssFilter: 'sepia(30%) saturate(130%) brightness(108%) hue-rotate(-10deg)', emoji: '🌅' },
  { id: 'cool',     label: 'Cool',     cssFilter: 'hue-rotate(190deg) saturate(120%) brightness(105%)', emoji: '❄️' },
  { id: 'vintage',  label: 'Vintage',  cssFilter: 'sepia(70%) contrast(90%) brightness(95%)', emoji: '🎞️' },
  { id: 'grayscale',label: 'B&W',      cssFilter: 'grayscale(100%) contrast(110%)', emoji: '🖤' },
  { id: 'pink',     label: 'Pink',     cssFilter: 'saturate(130%) hue-rotate(300deg) brightness(110%)', emoji: '🩷' },
  { id: 'dreamy',   label: 'Dreamy',   cssFilter: 'brightness(115%) contrast(85%) saturate(120%) blur(0.4px)', emoji: '💭' },
  { id: 'y2k',      label: 'Y2K',      cssFilter: 'saturate(180%) contrast(120%) hue-rotate(15deg) brightness(110%)', emoji: '💿' },
];

// ─── Frame templates ──────────────────────────────────────────────────────────

export interface FrameTemplate {
  id: string;
  label: string;
  emoji: string;
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'double';
  decorations: string[]; // emoji decorations placed on the frame
  bgPattern?: string;    // CSS background pattern
}

export const FRAME_TEMPLATES: FrameTemplate[] = [
  { id: 'sweetheart',     label: 'Sweetheart',          emoji: '💕', borderStyle: 'solid',  decorations: ['💕','🩷','♡','🌸'] },
  { id: 'clover',         label: 'Four-Leaf Clover',    emoji: '☘️', borderStyle: 'solid',  decorations: ['☘️','🌿','✿','✨'] },
  { id: 'babyblue_diary', label: 'Baby Blue Diary',     emoji: '📖', borderStyle: 'solid',  decorations: ['☁️','⭐','💙','💫'] },
  { id: 'strawberry',     label: 'Strawberry Milk',     emoji: '🍓', borderStyle: 'dashed', decorations: ['🍓','🥛','🎀','🌸'] },
  { id: 'mint_picnic',    label: 'Mint Picnic',         emoji: '🧺', borderStyle: 'solid',  decorations: ['🌷','✿','🍃','✨'] },
  { id: 'dreamy_ribbon',  label: 'Dreamy Ribbon',       emoji: '🎀', borderStyle: 'dashed', decorations: ['🎀','✨','💫','♡'] },
  { id: 'love_letter',    label: 'Vintage Love Letter', emoji: '💌', borderStyle: 'double', decorations: ['💌','🌹','🕊️','📜'] },
];

export const FRAME_COLORS = [
  { id: 'white',      label: 'Soft White',       hex: '#FFFFFF' },
  { id: 'blush',      label: 'Blush Pink',       hex: '#F7C8D5' },
  { id: 'babyblue',   label: 'Powder Blue',      hex: '#DDF5F7' },
  { id: 'mint',       label: 'Mint Green',       hex: '#D8F5D2' },
  { id: 'cream',      label: 'Warm Cream',       hex: '#FFF9E9' },
  { id: 'strawberry', label: 'Strawberry Pink',  hex: '#F2AFC2' },
  { id: 'charcoal',   label: 'Soft Gray',        hex: '#3D3D3D' },
];

// ─── Stickers ─────────────────────────────────────────────────────────────────

export interface StickerItem {
  id: string;
  type: 'emoji' | 'image';
  content: string;  // emoji char or image data URL
  x: number;        // percent of canvas width
  y: number;        // percent of canvas height
  scale: number;    // 1 = default
  rotation: number; // degrees
  selected?: boolean;
}

export const STICKER_CATEGORIES = {
  cute: ['💕', '🌸', '⭐', '🎀', '☁️', '✨', '🦋', '🌷', '🍒', '🌈', '💫', '🩷', '🌺', '🎶', '🍓', '🌙'],
  funny: ['😂', '😱', '🫢', '🥴', '🤪', '😤', '🫣', '👁️', '🙈', '😜', '🤭', '😵'],
  seasonal: ['🎂', '🎄', '🎁', '💝', '🎃', '🌹', '🎊', '🎉', '🎈', '🎆', '🌟', '❄️'],
};

export const STICKER_EMOJIS = [
  ...STICKER_CATEGORIES.cute,
  ...STICKER_CATEGORIES.funny,
  ...STICKER_CATEGORIES.seasonal,
];

export type Sticker = StickerItem;

// ─── Booth session state ───────────────────────────────────────────────────────

export interface BoothConfig {
  countdown: CountdownDuration;
  frameTemplate: FrameTemplate;
  frameColor: string;   // hex
  filter: FilterType;
  photoCount: PhotoCount;
}

export interface CapturedPhoto {
  id: string;
  dataUrl: string;
  filter: FilterType;
  takerName: string;
  position: number;
  timestamp: number;
  stickers?: StickerItem[];
}

export interface BoothSession {
  config: BoothConfig;
  photos: CapturedPhoto[];
  stickers: StickerItem[];
  caption: string;
  step: BoothStep;
}

export type BoothStep = 'setup' | 'camera' | 'retake' | 'customize' | 'print';

// ─── LDR types ────────────────────────────────────────────────────────────────

export type FilterTypeLegacy = FilterType;
export type BoothMode = 'solo' | 'ldr';
export type BoothStatus = 'waiting' | 'active' | 'capturing' | 'done';

export interface LDRBoothSession {
  id: string;
  code: string;
  hostName: string;
  guestName?: string;
  status: BoothStatus;
  photos: CapturedPhoto[];
  createdAt: string;
}

export interface JointCaptureSlot {
  slotNumber: number;
  hostPhoto: string | null;
  guestPhoto: string | null;
  compositePhoto: string | null;
}

export interface LDRRealtimeEvent {
  type:
    | 'PARTNER_JOINED'
    | 'PHOTO_TAKEN'
    | 'COUNTDOWN_START'
    | 'FLASH'
    | 'CLEAR_PHOTOS'
    | 'STRIP_READY'
    | 'READY_CHANGE'
    | 'START_COUNTDOWN'
    | 'START_SYNC_COUNTDOWN'
    | 'JOINT_PHOTO_UPLOADED'
    | 'WEBRTC_SIGNAL'
    | 'RETAKE_REQUEST'
    | 'RETAKE_RESPONSE';
  payload?: Record<string, unknown>;
}

export interface StripOptions {
  borderColor: string;
  frameTemplate?: FrameTemplate;
  title?: string;
  date?: boolean;
  layout: 'vertical' | 'grid';
  caption?: string;
}

export const STRIP_BORDER_COLORS = [
  '#FFB6C1', '#C9B1FF', '#B5EAD7', '#FFDAC1',
  '#AED9E0', '#FFFFFF', '#2D2D2D', '#FFE4E1',
];

export const DEFAULT_BOOTH_CONFIG: BoothConfig = {
  countdown: 3,
  frameTemplate: FRAME_TEMPLATES[0],
  frameColor: '#FFFFFF',
  filter: 'original',
  photoCount: 4,
};
