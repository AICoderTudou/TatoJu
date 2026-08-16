// 首页案例海报墙数据。id 对应封面文件 public/cases/{id}.png（竖版 2:3，随打包分发）。
// posterPrompt 供无头批处理 GENPOSTERS 调 RunningHub 生成；前端只用到 id/title/tag/hue。
export interface HomeCase {
  id: string
  title: string
  tag: string
  hue: number
  /** 海报文生图提示词（竖版 2:3，无文字、无版权 IP，规避安审） */
  posterPrompt: string
}

export const HOME_CASES: HomeCase[] = [
  {
    id: 'urban-storm',
    title: '都市风云',
    tag: '现代都市',
    hue: 210,
    posterPrompt: `A vertical Chinese urban drama poster, a confident businessman in a sharp dark suit standing before floor-to-ceiling windows overlooking a glittering night cityscape, cool blue and steel tones with warm window glow, cinematic dramatic lighting, shallow depth of field, glossy modern mood, photorealistic, vertical poster, no text, no watermark, 2:3 aspect ratio`
  },
  {
    id: 'spirit-war',
    title: '灵界战歌',
    tag: '玄幻修仙',
    hue: 270,
    posterPrompt: `A vertical Chinese xianxia fantasy drama poster, a robed cultivator wielding a glowing flying sword amid swirling spiritual energy above a sea of clouds, jade-green and gold ethereal light effects, epic mystical atmosphere, cinematic backlight, highly detailed, vertical poster, no text, no watermark, 2:3 aspect ratio`
  },
  {
    id: 'neon-night',
    title: '都市夜语',
    tag: '动漫短剧',
    hue: 250,
    posterPrompt: `A vertical 2D anime style drama poster, a stylish young woman under glowing neon signs on a rainy night city street, vibrant cyan and magenta neon palette, cinematic anime illustration, emotional mood, detailed, vertical poster, no text, no watermark, 2:3 aspect ratio`
  },
  {
    id: 'palace-love',
    title: '山河恋',
    tag: '古装·虐恋',
    hue: 330,
    posterPrompt: `A vertical Chinese period costume drama poster, an elegant woman in a flowing crimson hanfu gown in an ornate ancient palace, melancholic romantic mood, warm amber and red palette, soft cinematic lighting, ornate detail, photorealistic, vertical poster, no text, no watermark, 2:3 aspect ratio`
  },
  {
    id: 'city-maze',
    title: '都市迷踪',
    tag: '悬疑反转',
    hue: 200,
    posterPrompt: `A vertical suspense thriller drama poster, a solitary figure seen from behind on a rain-slicked neon-lit alley at night, moody cold tones with reflections, mysterious tense atmosphere, cinematic noir lighting, photorealistic, vertical poster, no text, no watermark, 2:3 aspect ratio`
  },
  {
    id: 'immortal-fate',
    title: '古风仙侠',
    tag: '宿命·双修',
    hue: 38,
    posterPrompt: `A vertical Chinese ancient-style xianxia romance poster, a graceful man and woman in flowing traditional robes beneath moonlit peach blossoms, dreamy ethereal atmosphere, soft pink and silver-blue palette, cinematic glow, beautiful detailed, vertical poster, no text, no watermark, 2:3 aspect ratio`
  },
  {
    id: 'war-god',
    title: '战神归来',
    tag: '热血逆袭',
    hue: 8,
    posterPrompt: `A vertical heroic action drama poster, a determined warrior standing backlit amid swirling embers and smoke after a battle, intense warm orange and amber glow, dramatic rim light, powerful cinematic atmosphere, photorealistic, vertical poster, no text, no watermark, 2:3 aspect ratio`
  }
]
