

export interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

// Declare window.aistudio for external API key selection
interface Window {
  aistudio: AIStudio;
}

// Updated Sidebar Tabs
export type SidebarTab = 'model' | 'pattern' | 'moodboard' | 'inpaint';

export interface AppConfig {
  apiKey: string;
  designImage: File | null;
  designWeight: number; // 0-3
  useTexture: boolean;
  textureImage: File | null;
  consistentModel: boolean;
  modelImage: File | null;
  // Removed specific FaceSwap flags, reused generic fields where possible
  usePose: boolean;
  bodyType: string;
  ageGroup: string;
  aiModel: string;
  style: string;
  count: number;
  ratio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  space: string;
  time: string;
  useReferenceBackground: boolean;
  referenceBackgroundImage: File | null;
  promptText: string;
  
  // New Fields for Inpaint
  maskImage: string | null; // Base64 string of the drawn mask

  // New Fields for Moodboard
  useMoodboardTemplate: boolean;
  moodboardTemplateImage: File | null;
  moodboardTheme: string; // New field for Theme & Keywords
}

export interface GeneratedImage {
  id: string;
  url: string;
  timestamp: number;
  isFavorite: boolean;
  prompt?: string;
}

export const INITIAL_CONFIG: AppConfig = {
  apiKey: "",
  designImage: null,
  designWeight: 2,
  useTexture: false,
  textureImage: null,
  consistentModel: false,
  modelImage: null,
  usePose: false,
  bodyType: "Châu Á",
  ageGroup: "20-30 tuổi",
  aiModel: "gemini-2.5-flash-image",
  style: "Chân thực",
  count: 1,
  ratio: "3:4",
  space: "Thiên nhiên, cảnh quan thiên nhiên, khu nghỉ dưỡng, du lịch, sông suối, khung cảnh tự nhiên",
  time: "Nắng đẹp",
  useReferenceBackground: false,
  referenceBackgroundImage: null,
  promptText: "",
  maskImage: null,
  useMoodboardTemplate: false,
  moodboardTemplateImage: null,
  moodboardTheme: "",
};