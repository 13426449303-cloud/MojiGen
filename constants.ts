import { EmotionConfig, EmotionType } from './types';

export const EMOTIONS: EmotionConfig[] = [
  { 
    id: 'love', 
    label: '爱你 (Love)', 
    emoji: '🥰', 
    promptSuffix: 'blowing a kiss with heart icons floating, expression of love and affection, blushing cheeks' 
  },
  { 
    id: 'angry', 
    label: '生气 (Angry)', 
    emoji: '😡', 
    promptSuffix: 'very angry expression, steam coming out of ears, red face, stomping feet or shaking fist' 
  },
  { 
    id: 'cry', 
    label: '哭泣 (Cry)', 
    emoji: '😭', 
    promptSuffix: 'crying streams of tears like a waterfall, sad expression, holding a tissue' 
  },
  { 
    id: 'laugh', 
    label: '大笑 (Laugh)', 
    emoji: '🤣', 
    promptSuffix: 'laughing hysterically, rolling on floor laughing, holding stomach, tears of joy' 
  },
  { 
    id: 'surprised', 
    label: '惊讶 (Shock)', 
    emoji: '😱', 
    promptSuffix: 'jaw dropping to the floor, eyes popping out, shocked expression, cartoon style shock' 
  },
  { 
    id: 'confused', 
    label: '疑惑 (Hmm?)', 
    emoji: '🧐', 
    promptSuffix: 'scratching head, question marks floating around head, confused expression, looking side to side' 
  },
  { 
    id: 'cheer', 
    label: '加油 (Cheer)', 
    emoji: '🎉', 
    promptSuffix: 'holding pom poms, cheering enthusiastically, confetti falling, jumping with joy' 
  },
  { 
    id: 'sleepy', 
    label: '困 (Sleepy)', 
    emoji: '😴', 
    promptSuffix: 'sleeping, zzz icons floating, snot bubble expanding and popping, wearing a nightcap' 
  },
  { 
    id: 'ok', 
    label: '收到 (OK)', 
    emoji: '👌', 
    promptSuffix: 'giving a big thumbs up, winking, showing an OK hand sign, confident expression' 
  },
  { 
    id: 'cool', 
    label: '耍酷 (Cool)', 
    emoji: '😎', 
    promptSuffix: 'wearing sunglasses, confident smirk, arms crossed, leaning against a wall, cool vibe' 
  },
  { 
    id: 'shy', 
    label: '害羞 (Shy)', 
    emoji: '😳', 
    promptSuffix: 'blushing intensely, hiding face behind hands, peeking through fingers, shy expression, red cheeks' 
  },
  { 
    id: 'rich', 
    label: '搞钱 (Rich)', 
    emoji: '🤑', 
    promptSuffix: 'dollar signs in eyes, holding stacks of money, golden sparkles, wealthy expression, excited face' 
  },
];

export const INITIAL_STICKER_STATE = EMOTIONS.reduce((acc, emotion) => {
  acc[emotion.id] = { status: 'idle' };
  return acc;
}, {} as Record<EmotionType, { status: 'idle' }>);