import type { StyleBible } from './types'

// 内置风格模板库。每个模板 = 一套现成的「风格圣经」(6 维影像参数) + 封面文生图提示词(16:10)。
// 选中即套用到项目风格圣经，无需调用 LLM。
// 真人 26 个为「好莱坞导演视角 + 全网搜索实证版」(代表影片/摄影师/工艺/具体色值)；2D/3D 为专业整理版。
export type StyleCategory = 'real' | '2d' | '3d'

export interface StyleTemplate {
  id: string
  category: StyleCategory
  name: string
  bible: StyleBible
  /** 封面文生图提示词（gpt-image-2，16:10，无文字） */
  coverPrompt: string
}

export const STYLE_TEMPLATES: StyleTemplate[] = [
  // ===================== 真人实拍电影（全网搜索实证版）=====================
  {
    id: 'real-90s-realist',
    category: 'real',
    name: '90年代写实电影风格',
    bible: {
      reference: `《七宗罪》(David Fincher / Darius Khondji)、《搏击俱乐部》(Fincher / Cronenweth)、《盗火线》(Michael Mann / Dante Spinotti)`,
      visualStyle: `90年代独立与犯罪类型片的粗粝写实主义。城市夜景、雨水、混凝土与霓虹倒影，气质冷硬、压抑、半纪录，拒绝光鲜美化`,
      colorGrading: `漂白留银(bleach bypass/ENR)：低饱和高反差。主色脏绿与铁锈棕#3E4A3A/#5C4733，辅冷青灰阴影#2A3137 与暗黄高光#B8924E；禁糖水鲜亮粉彩。色温偏冷中性，黑位深沉近全黑`,
      lighting: `实景动机光(钠灯/荧光/车灯)为主。硬质侧逆光勾轮廓，光比大(4:1+)，阴影厚重不补光，人物半张脸沉入暗部，荧光绿与钨丝橙同框冲突`,
      cameraLanguage: `35mm 标准至中焦(35–85mm)，手持肩扛半纪录晃动；信息密集、街道纵深与玻璃反射，画幅 2.39:1 或 1.85:1，自然眩光`,
      postTexture: `Kodak Vision 500T/250D，中偏粗颗粒，漂银减薄密度与脏污 patina，轻微 halation，雨痕水汽等真实瑕疵，湿冷脏感`,
      rhythmEditing: `沉稳压抑，长镜头与冷静凝视交替，剪辑克制，累积式张力偶被爆发暴力打断`
    },
    coverPrompt: `A lone detective in a worn trench coat standing under a flickering sodium streetlight on a rain-slicked urban alley at night, 1990s gritty crime film aesthetic, bleach-bypass desaturated palette of dirty greens and rust browns, deep crushed blacks, hard side light raking across a weathered brick wall, wet asphalt reflecting cold fluorescent and warm tungsten glow, fine 35mm film grain, subtle halation, anamorphic shallow depth of field, photorealistic cinematic still, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-retro-narrative',
    category: 'real',
    name: '复古叙事电影风格',
    bible: {
      reference: `《教父》(Coppola / Gordon Willis)、《美国往事》(Leone / Tonino Delli Colli)、70年代柯达 5247 时代经典叙事片`,
      visualStyle: `70年代新好莱坞怀旧史诗叙事。庄重温暖、带岁月包浆的回忆感，像被时光浸过的旧照片，沉静厚重，重氛围与内心`,
      colorGrading: `暖金主调——琥珀/青铜/焦糖#C9962E/#8C5A2B/#5A3A1E，辅暗红墨绿#6E2A22/#33402F；回忆段偏 sepia。禁冷蓝高科技与高饱和荧光。色温偏暖，阴影带暖棕非纯黑，中等对比`,
      lighting: `顶光与低位实用光(台灯/烛光/百叶窗)伦勃朗式明暗，Gordon Willis 式大胆欠曝——眼窝沉入阴影，光比大但过渡柔，暖钨光与冷窗光温差`,
      cameraLanguage: `稳重固定机位与缓慢推拉摇移，极少手持；对称古典构图、人物居中或三分，中长焦(40–100mm)，画幅 1.85:1 或 2.39:1`,
      postTexture: `Kodak 5247/5254 观感：饱和扎实、黑位带暖、细颗粒；轻柔 diffusion 朦胧光晕与 halation，gate weave 片门轻抖，做旧纸质暖调包浆`,
      rhythmEditing: `舒缓耐心、留白充足，长镜头与凝练剪辑，情绪靠时间堆叠，音乐与画面共烘年代厚重宿命感`
    },
    coverPrompt: `An intimate interior of a 1970s family gathering at a long wooden dinner table lit by a single warm overhead lamp and candlelight, vintage narrative epic aesthetic in the style of Gordon Willis, amber and bronze palette with deep umber shadows, Rembrandt chiaroscuro with eyes falling into darkness, underexposed nearly-black background, soft diffusion glow, warm film grain, gentle halation, sepia nostalgic patina, photorealistic period cinematic still, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-classic-hollywood',
    category: 'real',
    name: '美式复古好莱坞',
    bible: {
      reference: `《绿野仙踪》(Victor Fleming / Hal Rosson，三色 Technicolor)、《乱世佳人》(1939)、《罗宾汉历险记》(1938)`,
      visualStyle: `好莱坞黄金时代(30–50年代)三色 Technicolor 华丽奢美。明亮饱满戏剧化，造梦布景棚、明星光环，色彩浓艳如油画`,
      colorGrading: `三色染印浓郁高饱和——鲜艳正红#C8102E、宝石绿#1E6B45、明亮天蓝#2E6FB0 与金黄#E8B23A 同框争艳。禁低饱和脏调与现代青橙。色温暖中性，对比适中偏高，色彩纯净如彩绘玻璃，肤色红润`,
      lighting: `高调三点布光(key/fill/back 齐全)，柔光大面积铺照几无死黑；明星脸柔焦 + 眼神光、背光勾发 glamour rim；早期片速低需超强照明，画面通透立体`,
      cameraLanguage: `稳定摄影车与升降、优雅缓慢运动，古典严整舞台式构图，中近景突出明星，标准镜头，经典 1.37:1 或宽幅，华美布景纵深`,
      postTexture: `三色染印 transfer 质感：色彩极纯极稳、细腻无明显颗粒、通透；高光柔润，如上釉彩色海报，轻微年代柔焦光晕与丝绒影调过渡`,
      rhythmEditing: `古典稳健、章法分明，场面调度优先，歌舞情节段落分明，华丽转场与渐隐渐显，气派从容富戏剧仪式感`
    },
    coverPrompt: `A glamorous 1940s Hollywood golden-age scene of an elegant movie star in a vivid emerald gown on an opulent painted studio set, three-strip Technicolor aesthetic, lush highly saturated palette of brilliant ruby red, jewel green, sky blue and golden yellow, high-key three-point glamour lighting with soft eye light and rim hair light, no dark shadows, dye-transfer clean texture, velvety tonal transitions, soft vintage glow, photorealistic classic cinema still, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-neon-cyber',
    category: 'real',
    name: '霓虹赛博电影风格',
    bible: {
      reference: `《银翼杀手2049》(Villeneuve / Roger Deakins)、《银翼杀手》(1982，Scott / Cronenweth)、《攻壳机动队》视觉传承`,
      visualStyle: `赛博朋克近未来都市的霓虹黑色(neon-noir)。雨夜、摩天楼、全息广告与蒸汽，高科技与低生活并置，冷峻孤独瑰丽，人造光主宰画面`,
      colorGrading: `极致明暗冷暖对撞：近黑底#0A0E14 上点缀霓虹——电青#0ABDC6/#00E5FF、品红玫粉#EA00D9/#FF2DAA、电紫#711C91，局部暖橙红雾#FF5F1F/#C8402A 对比。禁自然柔和中间色与日光均匀照明。两极化、霓虹高饱和、阴影深而不死`,
      lighting: `光源即叙事：霓虹/LED屏/车灯/全息为主光，强彩色边光与逆光，大色块光罩在湿表面与烟雾中弥散；光比极大，人物常剪影或单侧霓虹勾边，体积光`,
      cameraLanguage: `2.39:1 宽幅，标准至广角呈现都市纵深与人物渺小；沉稳缓慢推移与对称构图，玻璃幕墙层叠反射，偶低机位仰拍压迫，霓虹眩光`,
      postTexture: `数字超清叠细微胶片颗粒软化，霓虹处明显 halation 与 bloom，湿表面高光、烟雾扩散、镜头炫光，湿润通透又带未来金属冷质`,
      rhythmEditing: `舒缓凝重、长镜头沉浸式氛围铺陈，留白与静默并重，视觉与声音设计驱动情绪，偶有爆点打破城市冥想`
    },
    coverPrompt: `A lone figure in a long coat standing in a rain-soaked neon-lit megacity street at night, towering skyscrapers covered in holographic magenta and cyan advertisements, cyberpunk neon-noir aesthetic in the style of Roger Deakins, near-black base with electric cyan, hot magenta and violet neon glows, volumetric light through mist and rain, strong colored rim light and silhouette, deep blacks with smooth highlight roll-off, wet reflective asphalt, lens flare and halation, fine film grain over crisp digital, photorealistic widescreen cinematic still, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-90s-china-rural',
    category: 'real',
    name: '90年代中国农村影视风格',
    bible: {
      reference: `《秋菊打官司》(张艺谋，纪实)、《黄土地》(陈凯歌 / 张艺谋摄影)、《红高粱》(张艺谋 / 顾长卫)`,
      visualStyle: `第五代导演乡土写实美学。黄土高原、麦田、土坯房与质朴农人，半纪录真实(偷拍/非职业演员)与对土地民族性的厚重凝视，粗粝苍茫带泥土阳光体温`,
      colorGrading: `大地暖调——黄土黄/麦秸黄/土褐#C79A4B/#A9762E/#6E4A24，招牌高粱红/对联红#A8281E 浓烈点缀，辅灰蓝天空#7E8C92。禁冷峻工业与高科技青橙。色温偏暖，土色厚重，阴影暖褐，对比受自然光支配`,
      lighting: `几乎纯自然光——顶头烈日、晨昏低角侧光、土屋内昏暗窗光与油灯；不刻意补光，保留真实曝光与脸上风霜`,
      cameraLanguage: `大量固定机位与稳定长镜头，大面积留白、地平线极端构图，人物渺小于天地；纪实段手持，标准镜头，1.85:1，水墨般造型感`,
      postTexture: `国产/柯达胶片中粗颗粒与略浑色彩，年代轻微褪色暖偏色，灰尘浮尘与土墙肌理突出，干燥粗粝旧影像包浆`,
      rhythmEditing: `舒缓凝滞近呼吸般的乡土节奏，长镜头静观，剪辑朴素少切换，以时间环境沉淀传递土地沉重与人物隐忍`
    },
    coverPrompt: `A weathered Chinese peasant woman in a padded cotton jacket standing before vast loess plateau terraces under a low pale-blue sky, 1990s Fifth Generation rural China film aesthetic, earthy palette of loess yellow, ochre brown and straw tones with a single bold sorghum-red accent, harsh natural overhead sunlight casting long shadows, dusty dry air with floating particles, mud-brick wall texture, medium-coarse film grain, slightly faded warm color cast, documentary realism, photorealistic cinematic still, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-cn-warm-blue',
    category: 'real',
    name: '中式暖调蓝辉风格',
    bible: {
      reference: `《花样年华》(王家卫 / 杜可风、李屏宾)、《重庆森林》(王家卫 / 杜可风)、《2046》`,
      visualStyle: `王家卫式港味怀旧情调。60年代香港逼仄走廊、旗袍、暧昧夜色，暖黄钨光旖旎与窗外冷蓝辉光交织，慵懒暧昧克制而暗涌的情欲，色彩即情绪`,
      colorGrading: `暖冷双调：室内暖黄琥珀#C98A3C/#9C5A28 裹暗红旗袍与墨绿#7A211C/#2E4034，窗外街道夜色透冷蓝青绿#1F4E6B/#2E6E6A 对比。禁平淡均匀白光。冷暖强对撞，暖处低色温浓郁、蓝辉高饱和，黑位带暖`,
      lighting: `暖色实用光主导(彩灯罩台灯/暖钨壁灯/街灯)营造亲密幽暗，窗外冷蓝/霓虹/月光透入做冷暖反差；光比大局部打亮，人物半隐光影，烟雾柔化弥散`,
      cameraLanguage: `中近景特写贴近情绪，大量前景遮挡(门框/镜子/栏杆)制造窥视隔阂，升格慢镜表现暧昧，手持微动，标准至长焦压缩空间，1.85:1`,
      postTexture: `胶片暖调柔润颗粒，暖光 halation 光晕，轻微 diffusion 柔焦，烟雾玻璃反光雨夜湿润，浓郁慵懒怀旧暖旧包浆`,
      rhythmEditing: `迟缓抒情、留白与重复，升格慢镜与定格凝视，剪辑跳跃而情绪连贯，配乐反复萦绕，时间停滞的暧昧`
    },
    coverPrompt: `A woman in an elegant patterned qipao standing in a narrow dim 1960s Hong Kong hallway, warm amber tungsten lamplight glowing on her while cool blue neon and street light spill through a window behind her, Wong Kar-wai aesthetic, rich warm-cool contrast of amber gold and teal-blue glow with deep crimson and ink-green accents, intimate low-key lighting, foreground framing through a doorway, cigarette smoke softening the light, gentle halation, film grain, lush nostalgic mood, photorealistic cinematic still, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-old-industrial',
    category: 'real',
    name: '老式工业影视风格',
    bible: {
      reference: `《潜行者》(Tarkovsky / Georgi Rerberg)、《血色将至》(P.T. Anderson / Robert Elswit)、苏联工业题材影像`,
      visualStyle: `后工业荒废与重工业时代冷峻写实。锈蚀钢铁、混凝土厂房、油井废墟，粗野主义几何与熵增腐朽并存，苍凉压抑纪念碑式沉重，人在巨大工业造物前渺小`,
      colorGrading: `低饱和冷灰主调与铁锈暖点对撞：钢灰/水泥/青绿#5B6266/#3E4A4D/#566B5E，锈红油褐#7A3B22/#553218 斑驳暖色，浊绿水洼#3A4A3A；部分段做旧 sepia。禁鲜亮糖水与霓虹。色温偏冷，锈处偏暖，对比厚重，黑位深沉减薄发灰`,
      lighting: `压抑天光与稀疏实用光——阴天散射、高窗灰光、油灯烛火暖点；Rerberg 式几乎不打光限制天光，Elswit 式 period 油灯暖光，阴影脏冷，质感优先`,
      cameraLanguage: `缓慢长镜头横移推进，凝视工业肌理与废墟纵深，对称或失衡纪念碑式构图，广角呈现厂房压迫与人物渺小，宽幅`,
      postTexture: `粗颗粒胶片与减薄发灰密度，做旧褪色脏污 patina，锈迹水渍混凝土金属高频肌理，轻微 halation 年代脏旧观感，干冷斑驳沉重`,
      rhythmEditing: `极缓凝滞近冥想的长镜头，剪辑稀疏克制，以时间流逝与空间沉默压迫，苍凉工业挽歌`
    },
    coverPrompt: `A small lone worker dwarfed by a vast rusting abandoned steel factory interior, broken concrete walls and corroded machinery, post-industrial decay aesthetic in the style of Tarkovsky's Stalker, desaturated cold palette of steel grey, concrete and teal-green with rust-red and oil-brown accents, murky stagnant water pools, diffuse pale daylight through high broken windows, heavy shadows, coarse film grain, faded weathered patina, monumental oppressive scale, photorealistic cinematic still, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-jp-bw-film',
    category: 'real',
    name: '日本黑白胶片摄影风格',
    bible: {
      reference: `森山大道(are-bure-boke 粗糙·摇晃·失焦)、《罗生门》(黑泽明 / 宫川一夫)、东京街头黑白纪实`,
      visualStyle: `日本战后黑白影像粗粝表现主义。森山式高反差重颗粒晃动失焦街拍，与黑泽明雕塑式光影并存，原始躁动感官失稳的都市气息`,
      colorGrading: `纯黑白极端高反差——深邃纯黑#000000 与刺目纯白#FFFFFF 对撞，中间灰被压缩、大块死黑爆白，无彩色。质感优先，影调粗暴戏剧张力`,
      lighting: `强硬直射光与深重阴影——黑泽明式甚至对太阳拍、强光树影斑驳；森山式街头闪光与夜灯生硬照明。光比极大，高光过曝暗部全黑，光影成造型主体`,
      cameraLanguage: `森山式不看取景器抓拍、倾斜失稳、广角贴近与运动模糊；黑泽明式长焦压缩、多机位凌厉纵深，4:3 或宽幅，动势强`,
      postTexture: `Kodak Tri-X 推到 1600(欠曝过冲)的粗重颗粒，模糊摇晃，暗房高反差厚重黑白，刮痕污点失焦作表现语言，生猛原始侵略性`,
      rhythmEditing: `躁动急促或凝重顿挫并存——街拍碎片化跳接冲击，或黑泽明式凌厉运动剪辑，强视觉冲击与情绪张力`
    },
    coverPrompt: `A high-contrast black and white street scene of a Tokyo back alley at night, a blurred figure caught mid-motion under harsh light, Daido Moriyama are-bure-boke aesthetic, extreme contrast with pure crushed blacks and blown-out whites, heavy coarse film grain from pushed Tri-X, motion blur and grit, raw destabilized tilted framing, deep shadows and stark highlights, monochrome only, gritty aggressive photorealistic photographic still, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-kr-cold',
    category: 'real',
    name: '韩国冷淡风电影风格',
    bible: {
      reference: `《燃烧》(李沧东 / 洪垧杓)、《分手的决心》(朴赞郁 / 金志容)、《老男孩》(朴赞郁 / 郑正勋)`,
      visualStyle: `韩国作家电影冷调极简写实。雾气暮色空旷郊外与都市疏离，克制暧昧隐忍而暗藏张力，情绪藏于留白与含混，精确几何与去戏剧化冷峻并存`,
      colorGrading: `低饱和冷调极简：青灰雾蓝暮绿#6E7A80/#5A6E72/#4E5E54 主导，辅暮光暖橙#B07A45 克制对比，素净。禁浓艳高饱和与暖糖水。色温偏冷，雾气段更去饱和发灰，对比柔和过渡细腻，留白多`,
      lighting: `大量自然光与暮色晨光临界光(燃烧爱夕阳)，柔散不美化；夜外景 LED 保留环境氛围非死黑，光比柔和阴影通透，可见与不可见的暧昧边界`,
      cameraLanguage: `精确克制几何构图与对称(朴赞郁 tableau)，沉稳缓慢运动与长镜头凝视，后期加雾制造暧昧朦胧，标准至长焦浅景深，2.39:1 留白充足`,
      postTexture: `干净数字叠细微颗粒去数码感，雾气柔光去饱和朦胧，柔和 halation 与细腻高光 roll-off，素净冷冽克制无脏污，清冷通透`,
      rhythmEditing: `缓慢留白克制隐忍，长镜头静默凝视，情绪在含混等待中累积，剪辑冷静精确，以氛围暗示替代外露冲突`
    },
    coverPrompt: `A solitary figure standing in a misty open field at dusk on the outskirts of a Korean town, modern Korean arthouse cold-minimalist aesthetic in the style of Lee Chang-dong's Burning, low-saturation cool palette of slate grey, foggy blue and muted green with a restrained warm-orange sunset accent, soft diffused natural twilight, gentle low-contrast tonal transitions, atmospheric haze, precise geometric composition with ample negative space, shallow depth of field, fine grain over clean digital, quiet melancholic mood, photorealistic cinematic still, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-wilderness',
    category: 'real',
    name: '荒野电影风格',
    bible: {
      reference: `《荒野猎人》(Iñárritu / Emmanuel Lubezki)、《边境杀手》荒漠段(Roger Deakins)`,
      visualStyle: `极端自然主义生存史诗。广袤未驯野(雪原/森林/河流/荒漠)为主角，人被环境吞没，真实原始临场脆弱，纪录片般可信`,
      colorGrading: `冷调自然色——雪原蓝灰#A7B4BE、森林墨绿#2E3B2C、河水钢青#4C5C63；辅晨昏微暖肤高光#C98F5E 与篝火橘#D6753A；禁饱和糖水与霓虹。偏冷，色温随晨昏(5000–6500K)，低饱和中高动态，阴影留冷蓝`,
      lighting: `几乎全程自然光与篝火，无人工补光。magic hour 柔和顶/侧逆光勾轮廓，阴天作天然柔光箱，光比大靠环境反射自然柔和，人脸常入半影`,
      cameraLanguage: `12–24mm 超广角，贴近主体手持长镜头与流动跟拍，沉浸失衡；低机位仰拍天空树冠，水平线压低凸显浩瀚，2.39:1，呼吸雾气水珠`,
      postTexture: `Alexa 65 模拟克制胶片，极细颗粒，冷调 LUT，轻微暗角，保留湿气雾霭通透，做旧不重重真实`,
      rhythmEditing: `缓慢绵长呼吸式，大量长镜头与留白，剪辑克制跟随自然与生存本能，静默积蓄后爆发瞬间暴力`
    },
    coverPrompt: `A lone fur-clad survivor trudging through a vast snow-dusted pine wilderness at dawn, breath fogging in freezing air, low golden side-light raking across frost, towering misty mountains behind, shot on wide-angle lens, handheld immersive realism, natural light only, desaturated cold blue-grey palette with faint warm sunrise glow, cinematic survival epic, ultra realistic, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-amber-yellow',
    category: 'real',
    name: '橙黄色电影风格',
    bible: {
      reference: `《疯狂的麦克斯：狂暴之路》(George Miller / John Seale / 调色 Eric Whipp)、《边境杀手》(Roger Deakins)`,
      visualStyle: `炽热饱和漫画式张力的荒漠/烈日美学。大面积暖橙金铺满，干渴能量危险史诗感，拒绝后启示录去色泛白，主动追求浓烈冲击`,
      colorGrading: `沙漠橙红#D9772E、烈日金黄#E8A23A、赭石土黄#B5651D；辅天空青蓝#2E8B9E 与阴影冷青#1F4E5A 冷暖对冲；禁阴郁灰绿与低饱和泥色。色温偏暖，高饱和高对比，肤色推古铜`,
      lighting: `强自然顶光/硬直射阳光为关键光，干裂高光与坚硬阴影，逆光尘埃体积光；光比偏大，人脸硬边阴影，夜戏 day-for-night 染深青蓝衬暖`,
      cameraLanguage: `广角到中焦，贴地动态追拍与中置对称(主体居中易读)，2.39:1，强纵深速度感，水平线干净突出天地`,
      postTexture: `数字 DI 重度调色(Baselight)推图像小说质感，颗粒细偏锐，高光暖溢，铬金属高反光，干净通透非做旧`,
      rhythmEditing: `高能明快节奏强烈，剪辑紧凑动作连贯且主体永远居中，视觉以连续冲击驱动，张弛分明`
    },
    coverPrompt: `A weathered figure standing on cracked desert hardpan under a blazing low sun, vast orange-gold dunes and dust haze filling the frame, a sliver of teal sky above, hard directional sunlight casting sharp shadows, backlit dust volumetrics, highly saturated amber palette with cool teal accents, graphic-novel cinematic look, ultra realistic, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-retro-war',
    category: 'real',
    name: '复古战争电影风格',
    bible: {
      reference: `《拯救大兵瑞恩》(Spielberg / Janusz Kamiński)、《兄弟连》、《父辈的旗帜》(Clint Eastwood)`,
      visualStyle: `纪实化去华丽的二战影像。模拟 1940 年代彩色新闻片的低科技去色粗粝，残酷真实而非温暖怀旧，泥泞硝烟金属与人的渺小`,
      colorGrading: `军绿橄榄#5A5F3C、卡其土褐#7D6E54、灰蓝#5E6B72；整体向绿偏移去饱和约 60%，辅爆破火光暖橙#C46A2E 与血色暗红#6E2B22 点缀；禁鲜艳糖水蓝。色温偏冷带蓝灰，高对比深黑(ENR/漂白旁路)，低饱和`,
      lighting: `自然主义为主，阴天散射软光模拟战地，无华丽布光；人脸常处灰雾散光，烟尘弥漫朦胧层次，高光被压阴影发蓝灰`,
      cameraLanguage: `贴身手持晃动肩扛跟拍(战地摄影师视角)，45°/90° 窄快门角度抽格频闪动感，中焦为主，构图凌乱真实，1.85–2.39:1`,
      postTexture: `Eastman 胶片经 ENR/漂白旁路银留存增强，黑更实、颗粒更重、对比更高，刮花镜头降反差，加重颗粒做旧新闻片质感，轻微脱色泛灰`,
      rhythmEditing: `凌厉混乱冲击强，战斗段快切声画失衡迷失感，静默段沉缓压抑，纪实节奏推进残酷`
    },
    coverPrompt: `WWII soldiers advancing through smoke and mud on a grey overcast battlefield, desaturated olive-drab and khaki tones shifted toward green, handheld documentary framing, harsh narrow-shutter motion, drifting smoke and dust, deep contrast and gritty film grain emulating 1940s color newsreel, bleak realistic war look, ultra realistic, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-horror',
    category: 'real',
    name: '恐怖电影风格',
    bible: {
      reference: `《女巫》《灯塔》(Robert Eggers / Jarin Blaschke)、《遗传厄运》(Ari Aster)`,
      visualStyle: `低照度压抑心理不安的恐惧美学。靠暗部、负空间与未知营造氛围，世界仿佛被抽干生气，克制写实让恐惧从日常缝隙渗出，非廉价惊吓`,
      colorGrading: `去饱和泥褐#3E3429、灰绿#4A5247、阴影墨黑#14110E；辅危险时刻血红#7A1E16 与烛火橘#B5712A；禁明快鲜亮暖色与高饱和。色温偏冷(蓝绿向)，低饱和高对比，暗部沉重无细节`,
      lighting: `极致低调布光，单一动机光源(烛光/窗光/门缝)制造大面积阴影与强明暗交界(chiaroscuro)，光比极大，人脸半隐于暗，阴影成叙事主体`,
      cameraLanguage: `缓慢推进、静止凝视或诡异慢摇，窥视压迫；广角轻畸变令空间失衡，偶用 1.66/1.19 窄方画幅强化幽闭，人物挤向一隅或对称僵硬`,
      postTexture: `胶片或胶片模拟，颗粒增强不安；黑白片追求灰蒙锈蚀霉旧微反差，暗部轻噪点做旧，阴郁潮湿缺乏光泽`,
      rhythmEditing: `缓慢压抑长时间凝滞蓄势，持续静默与不安累积张力，长铺垫后骤变剪辑或声音爆发释放恐惧`
    },
    coverPrompt: `A dim candle-lit interior of a weathered wooden cabin at night, a single source of warm flickering light carving deep shadows, a faint silhouette half-hidden in darkness, desaturated muddy brown and grey-green palette with one stab of blood-red, heavy chiaroscuro, oppressive low-key lighting, grainy film texture, dread-soaked horror atmosphere, ultra realistic, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-vintage-cinematography',
    category: 'real',
    name: '复古电影摄影风格',
    bible: {
      reference: `《留校联盟》(Alexander Payne / Eigil Bryld)、1970s 柯达 5247 时代胶片质感`,
      visualStyle: `刻意还原 1970 年代胶片拍摄的电影质感——不是"设定在七十年代"而是"看起来真的是七十年代拍的"。温暖柔和略褪色，亲密感与岁月包浆`,
      colorGrading: `褪色暖黄#C9A24B、土棕#8C6A45、奶油米#D8C9A8；辅复古墨绿#4F5B45 与暗红砖#8A4A33；低饱和大地色，禁现代清冷高饱和与霓虹。色温偏暖，对比适中，高光柔和 roll-off，阴影略提亮带年代感`,
      lighting: `柔和自然实用光与窗光，温暖动机光为主，光比温和过渡柔顺，保留高光细节、阴影不死黑，模拟旧胶片低宽容度柔润`,
      cameraLanguage: `Panavision 经典定焦(如 55mm)肖像式亲密，运镜沉稳、推拉变焦带时代味，古典稳重构图，1.85:1，略柔焦暖晕`,
      postTexture: `有机胶片颗粒、暖柯达发色、轻微褪色、柔和高光滚降，叠 halation 橘红光晕、gate weave 与老化做旧，数字经定制 LUT 复刻旧负片`,
      rhythmEditing: `舒缓人文从容，剪辑温和不急，镜头停留略长，怀旧叙事的呼吸感与温度`
    },
    coverPrompt: `A nostalgic 1970s-style interior portrait of a person near a sunlit window, warm faded Kodak tones, soft creamy highlights with gentle roll-off, muted earthy yellows and browns, visible organic film grain and subtle halation glow around highlights, classic 55mm portrait look, vintage photochemical film aesthetic, ultra realistic, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-retro-weird',
    category: 'real',
    name: '美式复古怪异影视风格',
    bible: {
      reference: `《双峰》《蓝丝绒》(David Lynch)、《小行星城》(Wes Anderson)`,
      visualStyle: `Lynchian + 复古 Americana 诡谲美学。熟悉的小镇/郊区/汽车旅馆怀旧美式场景下"看似正常却隐隐不对劲"，甜美表象藏不安暗流，梦境逻辑与超现实并存`,
      colorGrading: `褪色怀旧饱和——复古红#B2362F、薄荷绿#7FB7A3、奶黄#E7D08A、天空蓝#6FA8C7；辅霓虹暗影与暗红绒幕#5A1414；禁脏旧军绿与彻底去色。色温混合(暖光+冷阴影)，中高饱和带做旧灰膜，对比中等，甜腻又诡异反差`,
      lighting: `复古实用光(霓虹/汽车旅馆灯/室内暖灯)与诡异低调光混用，暖光藏冷阴影，人脸打光略平略过曝制造"过分正常"怪感，夜景浓郁红蓝霓虹切割`,
      cameraLanguage: `对称稳定(Anderson 正中)或缓慢诡异推近(Lynch)，凝滞窥视，中焦为主运镜平稳偶失常，1.85:1 或宽幅，复古道具色块精心布置`,
      postTexture: `Kodachrome 复古发色与柔焦边缘，暖胶片颗粒轻微褪色，叠做旧光晕，介于明信片鲜亮与陈旧不安之间，年代媒介瑕疵`,
      rhythmEditing: `节奏诡异刻意停顿留白制造不安，日常平稳叙事中突插超现实或慢速片段，打破现实逻辑产生 uncanny 错位`
    },
    coverPrompt: `A retro American small-town diner or motel at dusk, glowing neon sign, symmetrical centered composition, faded mid-century Americana colors of vintage red mint-green and cream, warm interior light with eerie cool shadows, slightly overexposed unsettling normalcy, Kodachrome-style faded film grain, surreal Lynchian uncanny mood, ultra realistic, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-high-key-white',
    category: 'real',
    name: '荒诞高调白色色调电影风格',
    bible: {
      reference: `《龙虾》《宠儿》《可怜的东西》(Yorgos Lanthimos / Robbie Ryan)`,
      visualStyle: `冷峻临床对称的荒诞主义。高调(high-key)明亮近乎无菌洁白空间，情感抽离、精确克制，Kubrick 式精密营造道德不适与超然疏离的黑色幽默`,
      colorGrading: `高调白#F2F0EB、冷灰白#DCDEE0、淡象牙#EDE7D8；辅苍白粉彩(淡蓝#BCD2DA、淡粉#E4C3C7、淡绿#C5D2BC)；禁浓重暗黑与高饱和暖色。色温中性微冷，高亮度低对比，阴影被填亮，饱和克制淡雅，均匀洁净疏离`,
      lighting: `大面积柔和高调布光，均匀填光抹去阴影，实用光与自然光制造明亮通透；光比极小阴影浅淡，偶用刺眼硬光制造临床压迫，人脸明亮平整缺乏温度`,
      cameraLanguage: `标志性 4–9mm 超广角/鱼眼畸变，冷峻对称、缓慢变焦推拉与轨道跟拍，监视般临床距离与失衡荒诞，镜头居中规整，1.66:1 或方画幅`,
      postTexture: `胶片拍摄(部分 Ektachrome)细腻颗粒，高调段干净明亮轻盈，广角边缘畸变明显，克制不做旧，胶片柔润与轻微溢光`,
      rhythmEditing: `冷静缓慢刻意，剪辑克制停顿生硬，长镜头与缓推制造荒诞不适与黑色幽默，情绪刻意压平`
    },
    coverPrompt: `A stark high-key white minimalist interior with symmetrical composition, a deadpan figure standing centered, bright even soft lighting with almost no shadows, pale clinical white and soft pastel palette, slight wide-angle fisheye distortion, cold detached absurdist mood, fine film grain, Kubrickian precision, ultra realistic, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-teal-orange',
    category: 'real',
    name: '蓝橙色调影视风格',
    bible: {
      reference: `《变形金刚》系列(Michael Bay)、众多好莱坞商业大片的 teal & orange 调色范式`,
      visualStyle: `高度商业化强对比的好莱坞大片语言。蓝(青)与橙互补对冲制造分离与冲击——橙调肤色暖前景在青蓝环境中弹出，光鲜动感戏剧化`,
      colorGrading: `互补对冲：中间调高光推橙(肤色#D98B5A、暖金高光#E0A86B)，阴影背景推青蓝#1E5F6E/#2A7A8C，暗部#14323A；禁脏中性灰与单一暖调泛滥。色温冷暖分离，高对比中高饱和，肤色保暖以在冷背景突出`,
      lighting: `暖关键光打主体(暖橙肤色)，冷环境/边缘光与背景压青蓝，明确冷暖分区；光比偏大轮廓清晰，常用冷逆光或边缘光勾边剥离主体`,
      cameraLanguage: `广角到长焦兼用，动感运镜、低角度英雄、旋转环绕与快速推拉强化气势，强调主体与背景的色彩与景深分离，2.39:1`,
      postTexture: `数字 DI 重度二级调色实现冷暖分离，干净锐利对比强烈，lens flare 与高光溢色点缀，颗粒极轻，光滑现代商业感非做旧`,
      rhythmEditing: `明快强劲商业节奏，剪辑紧凑富冲击，动作与音乐卡点驱动，冷暖对比与动感持续刺激`
    },
    coverPrompt: `A heroic figure lit by warm orange key light standing against a cool teal-blue industrial background, strong complementary teal-and-orange color grading, warm skin tones popping from cold surroundings, rim-light separation, lens flares, high contrast glossy blockbuster look, dynamic low-angle composition, ultra realistic cinematic, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-industrial',
    category: 'real',
    name: '工业电影风格',
    bible: {
      reference: `《银翼杀手2049》(Villeneuve / Roger Deakins)、《人类之子》(Emmanuel Lubezki)、《橡皮头》(David Lynch)`,
      visualStyle: `冷硬压抑的工业/野兽派(brutalist)反乌托邦。混凝土钢铁机械烟雾主导，人在巨型结构前渺小，世界被抽干生命，窒息单色调有毒氛围`,
      colorGrading: `混凝土冷灰#6A6E70、钢青#3E4A4F、机械暗黑#1B1E20；辅荧光绿#5A7A52(不适)、有毒黄#9A8A3C 或单一暖橙信号灯#C4622E 点缀；禁明快糖水与温馨暖调。色温偏冷(灰青向)，低饱和近单色高对比，阴影沉重，"被抽干生气"`,
      lighting: `Deakins 式单一动机光(广告牌/窗/水波反光)逻辑清晰硬朗，或 Lubezki 式强化荧光冷绿令人不安；光比大阴影实，大量逆光剪影，人物被结构与烟雾吞没`,
      cameraLanguage: `广角强调巨型空间与人渺小，稳定缓移或纪录片手持长镜头，严苛对称或极简构图、大面积负空间，2.39:1，水平线低压纵深强`,
      postTexture: `数字低饱和近单色 LUT，冷硬干净萧索，烟雾雾霾粉尘体积层次，轻微颗粒暗角，金属混凝土肌理强化，清晰锐利非做旧`,
      rhythmEditing: `缓慢沉重克制，长镜头与静止凝视让庞大空间发声，节奏压抑绵延，以氛围体量感而非动作驱动`
    },
    coverPrompt: `A tiny lone figure dwarfed by colossal brutalist concrete and steel structures in a smog-filled industrial dystopia, single-source hard light cutting through haze, near-monochrome cold grey and steel-teal palette with one sickly fluorescent green accent, deep shadows and silhouettes, vast negative space, suffocating toxic atmosphere, Deakins-style cinematography, ultra realistic, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-prosperity',
    category: 'real',
    name: '美式经济上行风格',
    bible: {
      reference: `《华尔街》(Oliver Stone / Robert Richardson)、《上班女郎》(Mike Nichols / Michael Ballhaus)、Amblin 系列(Spielberg / Allen Daviau)`,
      visualStyle: `里根时代"美国梦"上行气质：富足乐观、向上流动的雅皮资本主义影像。成功阳光、玻璃幕墙都市与郊区中产暖意，光鲜 MTV 化商业光泽，体面与野心`,
      colorGrading: `暖金阳光#E6B84C 与香槟金#D9C28A，辅都市天蓝#7FB3D5 与象牙白#F5EFE0，点缀成功感酒红#8B2E2E；禁脏绿病黄与冷死青蓝阴影。色温偏暖(4200–5200K)，中高对比中高饱和，高光干净，肤色红润，财富的光泽感`,
      lighting: `高调为主，大面积柔和主光 + 强填充，光比平缓(2:1–3:1)阴影浅而通透；magic hour 金色侧逆光勾边，落地窗自然光大量进屋，玻璃金属皮质高光反射体现物质富足`,
      cameraLanguage: `标准至中长焦(35–85mm)，稳定对称留白克制，人物居中或黄金分割凸显掌控感，平滑推轨/升降与微仰拍强化成功气场，1.85:1 或 2.39:1`,
      postTexture: `干净细腻胶片(类 Kodak Vision 中速)，颗粒极轻，高光微弱柔光晕，皮肤柔焦健康，轻度暖 LUT，黑位略抬不死黑，光洁广告级`,
      rhythmEditing: `明快积极向上，跟随事业上升递进感，work montage 配年代合成器音乐，剪辑流畅利落情绪持续推高，乐观能量韵律`
    },
    coverPrompt: `Cinematic wide shot of a confident young professional in a sharp 1980s power suit standing atop a glass-walled corporate skyscraper at golden hour, warm champagne sunlight flooding through floor-to-ceiling windows, glossy reflections on marble and brass, optimistic aspirational mood, prosperous American city glowing below, soft film bloom on highlights, healthy warm skin tones, high-key lighting, shot on 35mm Kodak negative, photoreal Hollywood blockbuster look, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-90s-hk',
    category: 'real',
    name: '90年代港片风格',
    bible: {
      reference: `《重庆森林》《花样年华》(王家卫 / 杜可风)、《喋血双雄》《辣手神探》(吴宇森，枪战暴力美学)`,
      visualStyle: `90年代香港都市影像：霓虹浸染、潮湿拥挤、暧昧迷离。王家卫式怀旧孤独 + 吴宇森式暴力浪漫并存，东方都市迷醉宿命情欲张力，超现实色彩象征与街头烟火共生`,
      colorGrading: `高饱和强色块：霓虹翠绿#1FA77A(乡愁孤独)与暗夜青蓝#1B3B5F(忧郁)，辅浓烈正红/暗红#B11226(激情)、暖钨黄#E0A33E，点缀霓虹粉紫；禁平淡灰白与现代青橙预设。色温混合(钨暖 3200K 撞夜冷蓝)，高对比高饱和黑位浓郁，色彩即叙事`,
      lighting: `实用光主导(霓虹招牌/窗外街灯/钨丝吊灯/楼道日光灯混色)，低调硬光大块阴影情绪暗角，光比偏大(4:1+)，彩色光外斜切人物半明半暗，潮湿表面反射霓虹斑驳`,
      cameraLanguage: `广角(24–35mm)贴近，框中框(窗/门/栏杆)、镜面反射、拥挤前景，杜可风手持游移与抽帧/降格步进印片模糊拖尾，吴宇森慢镜白鸽双枪，幽闭构图 1.85:1`,
      postTexture: `90年代快速负片高感颗粒明显，色彩浓郁略溢，霓虹 halation 红光晕染，暖钨光晕开，做旧潮湿，街景烟雾水汽质地`,
      rhythmEditing: `两极并存：王家卫慢板抒情抽帧凝滞与跳切碎片化，吴宇森枪战快剪+慢镜凌厉爆裂，情绪化跳跃富音乐性，节奏服从氛围心绪`
    },
    coverPrompt: `Cinematic medium shot of a lonely figure in a cramped neon-soaked Hong Kong street at night, glowing green and red Chinese neon signs reflecting on wet pavement, tungsten amber window light mixing with cold blue shadows, saturated colors, framing through a rain-streaked window, moody atmospheric haze, 1990s Hong Kong cinema mood, visible film grain, neon halation glow, photoreal Wong Kar-wai inspired look, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-techy',
    category: 'real',
    name: '科技感电影风格',
    bible: {
      reference: `《银翼杀手2049》(Villeneuve / Roger Deakins)、《沙丘》(Greig Fraser)、《创：战纪》《少数派报告》`,
      visualStyle: `克制极简高级的近未来科技美学：冷峻洁净宏大疏离。技术的"沉静在场感"而非炫技，几何秩序、巨型空间与人的渺小，未来感孤独感精密工业美`,
      colorGrading: `冷青/钢蓝#2E5A6B 与石板灰#4A5560，辅全息界面冷白蓝#BFE3F0，关键场景大面积单色雾(警示橙雾#C6622E 或科技青绿)；低饱和克制，避免重手青橙；深黑位平滑高光滚降。色温冷(5600–7000K)，局部冷暖单色块强对比`,
      lighting: `单一逻辑光源(single-source)美学：巨型广告/窗/水面焦散反光，光会"动"几乎无静止布光；烟雾雾气作可塑发光介质营造体积光与渐变背景，低调与高调交替，硬边阴影几何利落`,
      cameraLanguage: `标准球面镜头、简化干净对称，极静缓推与稳健升降/摇臂拒绝晃动，大量极宽全景把人压成小点强调尺度孤独，2.39:1`,
      postTexture: `数字经 film-out 回扫，介于胶片有机与数字锐利之间，颗粒极细均匀，高光柔滑滚降黑位深沉干净，金属/玻璃/全息精密反射，极少做旧`,
      rhythmEditing: `沉稳缓慢催眠式，长镜头与留白呼吸信息克制，剪辑节制转场利落，靠空间与声音设计推进沉浸，宏大冷静史诗`
    },
    coverPrompt: `Cinematic ultra-wide shot of a lone figure dwarfed inside a vast minimalist futuristic interior, cold steel-blue and slate-grey palette, a single massive holographic light source casting volumetric beams through thin atmospheric haze, glowing cyan interface reflections on glass and metal, deep clean blacks, restrained desaturated sci-fi grade, symmetrical geometric composition, still contemplative mood, large-format spherical lenses, photoreal Roger Deakins inspired look, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-mystery',
    category: 'real',
    name: '悬疑电影风格',
    bible: {
      reference: `《七宗罪》(David Fincher / Darius Khondji，漂白旁路)、《十二宫》(Fincher，数字暗调)、现代色彩黑色电影`,
      visualStyle: `阴郁压抑潮湿的现代黑色电影/惊悚。写实但高度风格化的"黑暗清晰感"(dark clarity)，持续不安威胁潜伏，理性冷峻犯罪调查氛围，病态城市阴冷质感`,
      colorGrading: `去饱和脏绿—黄绿#5A6650 与冷灰青#3D474A，辅暗黄路灯#8A6E3A 与发霉墙色，回避高饱和与品红；深沉浓黑#0C0E0D 主导，washed-out 褪色中间调，漂白旁路压缩高光保留厚黑位。中高对比低饱和，色温偏冷雨夜泛冷蓝`,
      lighting: `低调重阴影：大量暗部与剪影，光来自外部逻辑光源(窗外/台灯/车灯)，硬光刀刻明暗交界，光比大(8:1+)，顶/侧光塑造威胁孤立，人脸常半隐于暗`,
      cameraLanguage: `克制精准——稳定缓慢推拉、隐秘窥视视角与不易察觉微移，中长焦压缩制造监视感，构图严谨负空间心理压迫，2.39:1 或 1.85:1`,
      postTexture: `Khondji 漂白旁路：银盐保留→颗粒粗砺对比强去色，暗调脏污高光发灰黑位厚重；数字时代精细噪点与压暗 LUT，潮湿冷峻犯罪现场质地`,
      rhythmEditing: `冷静克制令人窒息的渐进式悬念，长镜头积累压迫信息缓慢揭示，剪辑精确不炫技，靠氛围留白维持挥之不去的恐惧与理性`
    },
    coverPrompt: `Cinematic low-key shot of a detective standing in a dim rain-soaked apartment lit only by a single harsh window source, heavy shadows swallowing the room, desaturated sickly green-grey palette, deep crushed blacks, washed-out highlights, gritty bleach-bypass texture with coarse grain, oppressive ominous atmosphere, hard shadow edges across the face, photoreal David Fincher Se7en inspired noir thriller look, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-greek-myth',
    category: 'real',
    name: '希腊神话电影风格',
    bible: {
      reference: `《特洛伊》(Wolfgang Petersen，古典实拍史诗)、《300勇士》(Zack Snyder，数字褐金 crush)、《惊天战神》Immortals(Tarsem Singh，文艺复兴油画式)`,
      visualStyle: `古典与神话的宏大史诗：介于"写实剑与凉鞋史诗"与"会动的文艺复兴油画"之间。青铜黄金大理石英雄主义，神性光辉与凡间血肉并存，雕塑般身体、画面如壁画油画`,
      colorGrading: `黄金#C9A227 与青铜#8C6A3F，辅大理石暖白#EAE0CE、神性天光金#F2D789，血战段浓重暗红#6E1A12；Snyder 式整体褐金#7A5A2E + 高光提亮暗部 crush。禁现代冷青与霓虹。色温暖(3800–5000K)高对比，饱和视流派(实拍中高饱和 / 300 压低褐金单色)`,
      lighting: `强戏剧硬光与逆光——神性顶光/天光如圣光降临，边缘金色轮廓光勾肌肉盔甲，大光比(英雄面光、背景沉暗)雕塑感，火把夕阳暖橙实用光，尘埃烟雾体积光束`,
      cameraLanguage: `广角大远景表现战场神殿恢弘 + 中长焦特写英雄面部，Snyder 式慢镜与变速升格把战斗变移动浮雕，仰拍塑造神性威严，大量对称油画式构图，2.39:1`,
      postTexture: `数字布景合成油画/壁画质感(300、Immortals)笔触水彩晕染，实拍史诗则厚重胶片颗粒 + 金属高光，尘土飞扬做旧古意，青铜与汗水皮肤高光，如古典绘画被点亮`,
      rhythmEditing: `庄严恢弘起伏跌宕，战斗慢镜与快剪交替制造仪式感冲击，宏大配乐驱动，英雄独白与战前蓄势张力，神话气场强烈`
    },
    coverPrompt: `Cinematic heroic wide shot of a muscular ancient Greek warrior in bronze armor standing before towering marble temple columns, divine golden god-light beaming from above through dust and haze, bronze and gold palette with warm marble whites, rim-lit sculpted physique, dramatic high-contrast hard lighting, epic mythological grandeur, painterly Renaissance-like composition, deep amber shadows, photoreal cinematic sword-and-sandal epic look, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-us-retro',
    category: 'real',
    name: '美式复古影视风格',
    bible: {
      reference: `《甘草披萨》(P.T. Anderson，Kodak 35mm + C 系列变形镜)、《好莱坞往事》(Tarantino / Robert Richardson，碳弧灯)、《美国风情画》`,
      visualStyle: `70年代美国怀旧影像：温暖慵懒、阳光蒸腾的加州式乡愁。原生粗粝不刻意修饰的质朴，介于纪实与梦境的"怀旧幻觉"，复古真挚的年代体温`,
      colorGrading: `暖琥珀#D99A4E 与晒褪金黄#C9A86A，辅复古蓝绿#5E8C7E、暖肤橙、土黄，阴影暖褐#4A3826；70年代 Eastman Color 暖偏色、饱和适中、动态略低、阴影偏暖；禁现代冷青与高科技洁净。色温偏暖(4000–5000K)中等对比，高光易过曝泛黄，晒透暖意`,
      lighting: `拥抱原生粗粝——不强行柔化控光，正午加州烈日直打、车内自然光不补，碳弧灯硬朗暖光，自然光主导允许过曝与镜头光斑，阳光蒸腾慵懒午后`,
      cameraLanguage: `70年代变形宽银幕(Panavision C 系列)，软焦浅景深、横向蓝色镜头光斑，暖偏色构图，跟随式横移长镜头与温柔推拉，2.39:1 变形宽银幕年代感`,
      postTexture: `真 35mm Kodak：明显悦目颗粒、gate weave 轻抖、halation 高光红晕、横向变形光斑，暖偏色复古配方边缘柔化，胶片有机呼吸与年代体温，几乎不数字锐化`,
      rhythmEditing: `松弛漫游随性，长镜头呼吸与人物闲逛式叙事，情绪温柔不催促，复古流行金曲驱动段落，散文诗般怀旧韵律与青春慵懒`
    },
    coverPrompt: `Cinematic warm shot of teenagers hanging out by a vintage car on a sun-drenched 1970s San Fernando Valley street, hazy golden late-afternoon light, amber and faded-gold palette with retro teal accents, blown-out warm highlights, horizontal anamorphic blue lens flare, soft shallow depth of field, visible 35mm film grain and halation glow, nostalgic dreamy mood, photoreal Paul Thomas Anderson Licorice Pizza inspired retro look, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-hollywood-bw',
    category: 'real',
    name: '好莱坞黑白电影风格',
    bible: {
      reference: `《辛德勒的名单》(Spielberg / Janusz Kamiński)、《灯塔》(Robert Eggers / Jarin Blaschke，正色片 + 1.19:1)、《罗马》(Alfonso Cuarón)`,
      visualStyle: `黑白影像两种正统：德国表现主义/经典黑色电影的高反差明暗法(如《灯塔》)，与更自然主义纪实质感的现代黑白(如《罗马》)。共通于纯粹永恒、剥离色彩后形与光的戏剧`,
      colorGrading: `纯黑白：浓黑#0A0A0A 到纯白#F7F7F7。表现主义路线极端高反差、深黑长影、爆亮高光；自然主义(罗马)丰富中灰、柔过渡克制；正色片(orthochromatic)使蓝/红异常——皮肤偏暗天空偏白。无彩色，纯靠影调对比叙事`,
      lighting: `灯塔/表现主义：极亮硬光满足黑白曝光，刀锋明暗交界、深邃投影、底光顶光不安造型，光比极大；罗马/自然主义：大面积柔和自然光、丰富中间调、阴影通透，光比平缓写实`,
      cameraLanguage: `灯塔 1.19:1 近正方画幅强化幽闭与塔的纵向压迫复古镜头；辛德勒手持纪实跟拍；罗马 65mm 数字、缓慢横摇长镜头与广角全景，讲究形与影的雕塑性，1.19/1.37/1.85:1`,
      postTexture: `灯塔实拍 Kodak Double-X 5222 + 定制正色滤镜，颗粒粗砺复古；辛德勒黑白纪实颗粒；罗马数字转黑白细腻干净。普遍带年代颗粒轻微做旧，银盐灰阶厚度`,
      rhythmEditing: `依风格而异：表现主义惊悚缓慢压抑长镜头积累，纪实历史庄重沉痛，罗马从容长镜生活流呼吸，共通在去色后更聚焦光影、表演与构图本身`
    },
    coverPrompt: `Cinematic high-contrast black and white shot of a weathered face half-lit by a single harsh hard light source, deep chiaroscuro shadows carving the frame, brilliant blown highlights, rich silver-grey tonal range from inky black to pure white, German Expressionist mood, dramatic long shadows, coarse vintage 35mm film grain, claustrophobic timeless atmosphere, photoreal Robert Eggers The Lighthouse inspired monochrome look, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: 'real-purple-tone',
    category: 'real',
    name: '紫色色调电影风格',
    bible: {
      reference: `《霓虹恶魔》(Nicolas Winding Refn / Natasha Braier)、《唯神能恕》(Refn，紫红地狱)、《春假》(Benoît Debie，荧光霓虹)`,
      visualStyle: `高度风格化、催眠致幻的合成紫色美学：人造华丽危险情欲。紫与品红营造如梦似魇的清醒梦境，介于时尚大片与噩梦，beauty 与 horror 合一的自恋沉沦，强烈人工感与超现实色彩主义`,
      colorGrading: `品红紫#8E2DA8 与深紫罗兰#5B2A86，辅霓虹粉#E0408A、青绿松石#2BB6A8、地狱暗红#7A1020；Braier 式"红偏品红粉、蓝偏青绿与丁香紫"，刻意排除黄与橙。极高饱和强对比，人工艳丽如夜店灯胶，色温混合冷暖极色，黑位浓郁`,
      lighting: `彩色实用光/灯胶主导(紫/品红/青绿 LED 与霓虹直打)，几何化布光、横向条状镜头光斑，人造生硬艳丽如舞厅，两侧色对撞(紫撞青)双色造型，彩色边光与镜面反射，几乎全 in-camera`,
      cameraLanguage: `对称仪式化、静态或极缓运镜(Refn 凝视美学)，中长焦肖像式特写凸显人物如雕塑/时尚标本，横向变形镜头光斑斜切，构图极简平面化强调几何镜面，2.39:1`,
      postTexture: `数字洁净光滑(强调色彩纯度而非颗粒)，高饱和紫/品红高光带辉光晕(bloom)，镜面/皮肤/玻璃反光华丽，近乎无做旧，人造平滑时尚大片超现实光泽`,
      rhythmEditing: `缓慢催眠仪式化，长时间凝滞静态画面与合成器电子配乐共振迷幻沉浸，剪辑克制风格化，情绪在静默中累积不安与诱惑，梦境威胁感强烈`
    },
    coverPrompt: `Cinematic symmetrical portrait of a striking model bathed in synthetic magenta and deep violet light, turquoise rim light cutting from the side, glowing neon-pink accents, ultra-saturated purple palette with no yellow or orange, geometric club-gel lighting, horizontal lens flare slashing the frame, mirror reflections, hypnotic surreal dreamlike mood, glossy clean digital texture with purple bloom glow, photoreal Nicolas Winding Refn Neon Demon inspired look, no text, no watermark, 16:10 aspect ratio`
  },

  // ===================== 2D 插画 / 动画 =====================
  {
    id: '2d-anime-concept',
    category: '2d',
    name: '二次元概念艺术风格',
    bible: {
      reference: '二次元概念艺术（日式 key visual）',
      visualStyle: '精致二次元概念图，唯美氛围，电影感构图的动漫插画',
      colorGrading: '通透清新，蓝青#6FA8D6 与暖橙点缀，中高饱和、明亮',
      lighting: '柔和氛围光与逆光描边，丁达尔光束，明暗层次丰富',
      cameraLanguage: '电影感构图、大场景纵深，俯仰视角，人物居中留白',
      postTexture: '干净线稿 + 柔和厚涂上色，光斑与空气感颗粒',
      rhythmEditing: '单幅 key visual，强氛围叙事'
    },
    coverPrompt: `A polished anime key visual concept illustration, a character in an atmospheric cinematic scene, fresh blue and warm orange palette, soft rim backlight with god rays, detailed painterly rendering, digital concept illustration, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-us-game-concept',
    category: '2d',
    name: '美国游戏概念艺术风格',
    bible: {
      reference: '美式 3A 游戏概念原画',
      visualStyle: '欧美游戏原画，写实厚重，宏大世界观，硬核质感',
      colorGrading: '低饱和厚重，棕褐#5A4632 与冷钢蓝，强明暗对比',
      lighting: '戏剧性体积光与环境光遮蔽，强氛围光雾',
      cameraLanguage: '宏大广角场景、英雄低角度，纵深层次',
      postTexture: '厚涂笔触、写实材质、肌理粗粝',
      rhythmEditing: '史诗单幅，环境叙事'
    },
    coverPrompt: `An American AAA game concept art, an epic heroic character in a vast detailed environment, muted brown and steel-blue palette, dramatic volumetric lighting and fog, painterly thick brushwork, digital concept illustration, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-jp-flat',
    category: '2d',
    name: '日系平涂插画风格',
    bible: {
      reference: '日系平涂插画（清新厚薄结合）',
      visualStyle: '日系清新平涂，简洁干净，治愈日常',
      colorGrading: '高明度低对比，粉蓝#BFE0F0 与奶黄，柔和清新',
      lighting: '均匀柔光，少阴影，轻微高光',
      cameraLanguage: '平视近景、日常构图，简洁背景',
      postTexture: '平涂色块 + 干净线条，少肌理',
      rhythmEditing: '小清新单幅，安静日常'
    },
    coverPrompt: `A Japanese flat-color anime illustration, a character in a calm everyday scene, soft pastel blue and cream palette, even gentle lighting, clean lineart with flat shading, healing slice-of-life mood, digital illustration, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-vaporwave',
    category: '2d',
    name: '插画蒸汽波风格',
    bible: {
      reference: '蒸汽波 vaporwave 插画',
      visualStyle: '复古未来蒸汽波，80s 霓虹梦核，迷幻怀旧',
      colorGrading: '霓虹粉#FF6EC7 与青蓝#3BE0F0 渐变，高饱和梦幻',
      lighting: '霓虹辉光与网格地平线发光，柔光晕',
      cameraLanguage: '单点透视网格、对称构图，复古元素拼贴',
      postTexture: '渐变色、扫描线、故障与光晕',
      rhythmEditing: '静态梦核氛围'
    },
    coverPrompt: `A vaporwave illustration, retro-futuristic dreamscape with neon grid horizon and 80s elements, saturated pink and cyan gradient, glowing haze, scanlines, one-point perspective, digital illustration, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-cyberpunk-illust',
    category: '2d',
    name: '赛博朋克数字插画风格',
    bible: {
      reference: '赛博朋克数字插画',
      visualStyle: '赛博朋克未来都市插画，高科技低生活，霓虹雨夜',
      colorGrading: '青蓝#1BD4E0 与品红#FF2E88 霓虹，黑深底，高对比',
      lighting: '霓虹光源、湿润反光、强逆光，体积雾',
      cameraLanguage: '低角度仰视高楼、广角街景，强透视',
      postTexture: '精细数字绘、发光特效、雨丝反光',
      rhythmEditing: '信息密集单幅，未来叙事'
    },
    coverPrompt: `A cyberpunk digital illustration, a character in a neon-soaked futuristic megacity alley at night, magenta and cyan neon, wet reflections, volumetric haze, low-angle perspective, detailed digital painting, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-game-concept',
    category: '2d',
    name: '游戏概念艺术风格',
    bible: {
      reference: '通用游戏概念原画',
      visualStyle: '游戏概念设计，奇幻世界，氛围宏大，设定感强',
      colorGrading: '中饱和、冷暖对比，青绿#3A6A5A 与暖光点',
      lighting: '环境氛围光与主光源，体积光雾',
      cameraLanguage: '广角场景、纵深层次，人物点缀比例尺',
      postTexture: '厚涂 + 笔触质感，材质丰富',
      rhythmEditing: '世界观单幅叙事'
    },
    coverPrompt: `A fantasy game concept art, a vast atmospheric world with a small figure for scale, balanced teal and warm accent palette, volumetric ambient light, painterly brushwork, digital concept illustration, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-guoman',
    category: '2d',
    name: '国漫二次元常用风格',
    bible: {
      reference: '国漫二次元（国风仙侠动漫）',
      visualStyle: '国漫仙侠二次元，飘逸唯美，东方韵味与现代动漫结合',
      colorGrading: '清雅国风色，青碧#5FA88C 与朱砂点缀，中饱和通透',
      lighting: '柔光氛围与灵气光效，逆光描边',
      cameraLanguage: '飘逸动势、仙侠场景纵深，人物居中',
      postTexture: '细腻厚涂、流光特效、发丝服饰飘动',
      rhythmEditing: '唯美单幅，仙气叙事'
    },
    coverPrompt: `A Chinese anime (guoman) xianxia illustration, an elegant flowing character with spirit-energy effects in an ethereal oriental scene, jade-green and cinnabar palette, soft glowing rim light, detailed painterly rendering, digital illustration, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-dali',
    category: '2d',
    name: '达利风格',
    bible: {
      reference: '萨尔瓦多·达利超现实主义',
      visualStyle: '超现实主义，梦境扭曲，荒诞象征，融化变形',
      colorGrading: '暖褐荒漠#C2A06A 与天蓝，中饱和、古典油画调',
      lighting: '清澈长投影、戏剧性侧光，超现实通透',
      cameraLanguage: '空旷地平线、远近怪诞并置，深景',
      postTexture: '精细古典油画笔触、光滑写实',
      rhythmEditing: '象征静谧梦境'
    },
    coverPrompt: `A surrealist painting in the style of Salvador Dalí, melting distorted objects in a vast empty desert with long shadows, warm ochre and sky-blue palette, classical oil rendering, dreamlike, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-ink-bw',
    category: '2d',
    name: '黑白水墨风格',
    bible: {
      reference: '中国黑白水墨画',
      visualStyle: '传统水墨，写意留白，黑白浓淡，东方意境',
      colorGrading: '纯水墨黑白，墨色浓淡层次，大量留白',
      lighting: '无具象光源，靠墨色明暗与留白表现',
      cameraLanguage: '写意构图、计白当黑，散点透视',
      postTexture: '宣纸渗墨、飞白笔触、晕染',
      rhythmEditing: '意境留白，禅意'
    },
    coverPrompt: `A traditional Chinese ink wash painting, monochrome black ink with rich tonal gradients and abundant negative space on rice paper, expressive brushstrokes, zen oriental mood, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-retro-psychedelic',
    category: '2d',
    name: '复古肌理迷幻插画风格',
    bible: {
      reference: '70s 复古肌理迷幻插画',
      visualStyle: '复古迷幻，颗粒肌理，70s 海报感，柔和怀旧',
      colorGrading: '复古暖橙#E08A4A 与芥末黄、暗青，低饱和做旧',
      lighting: '平面化柔光，渐变光晕',
      cameraLanguage: '平面装饰构图、对称图形，海报式',
      postTexture: '颗粒噪点、套印错位、纸张肌理',
      rhythmEditing: '复古海报单幅'
    },
    coverPrompt: `A retro psychedelic textured illustration, 70s poster style with grainy print texture, muted warm orange mustard and teal palette, flat decorative composition, misregistered print look, digital illustration, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-crayon',
    category: '2d',
    name: '儿童蜡笔手绘插画风格',
    bible: {
      reference: '儿童蜡笔手绘插画',
      visualStyle: '童趣手绘，蜡笔质感，稚拙温暖，绘本感',
      colorGrading: '明快高饱和、温暖，蜡笔斑驳色',
      lighting: '平面无强光，整体明亮',
      cameraLanguage: '稚拙构图、平视童趣视角',
      postTexture: '蜡笔笔触、纸张颗粒、手绘不规整边缘',
      rhythmEditing: '绘本式温馨单幅'
    },
    coverPrompt: `A children's crayon hand-drawn illustration, naive warm storybook scene with waxy crayon texture on paper, bright cheerful palette, flat lighting, childlike composition, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-bw-manga',
    category: '2d',
    name: '黑白二维漫画动画风格',
    bible: {
      reference: '黑白二维漫画/动画',
      visualStyle: '黑白漫画，网点排线，二维动画感，干净叙事',
      colorGrading: '纯黑白，网点灰阶，高对比线条',
      lighting: 'cel 明暗块面、网点阴影',
      cameraLanguage: '漫画分镜构图、对话场景，速度线',
      postTexture: '清晰墨线、screentone 网点、排线',
      rhythmEditing: '漫画格叙事节奏'
    },
    coverPrompt: `A black-and-white 2D manga illustration, clean ink lineart with screentone dots and hatching, monochrome high contrast, dynamic panel composition with speed lines, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-shonen',
    category: '2d',
    name: '高质量2D热血动漫风格',
    bible: {
      reference: '高质量热血少年动漫',
      visualStyle: '热血少年动漫，高燃战斗，动势强烈，光效炸裂',
      colorGrading: '高饱和鲜明，橙红#FF5A2A 与电蓝，强对比',
      lighting: '强戏剧光、能量光效与爆闪，硬描边光',
      cameraLanguage: '极端透视、动态俯仰、冲击构图，速度线',
      postTexture: '精致厚涂 + 锐利线条、粒子光效',
      rhythmEditing: '高燃战斗瞬间，定格冲击'
    },
    coverPrompt: `A high-quality shonen battle anime illustration, an energetic warrior mid-action with explosive energy effects, saturated orange-red and electric blue palette, dramatic dynamic lighting, extreme perspective with speed lines, detailed rendering, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-otomo',
    category: '2d',
    name: '大友克洋风格',
    bible: {
      reference: '大友克洋（AKIRA 写实劇画）',
      visualStyle: '硬核写实劇画，机械精密，赛博废土，细节密集',
      colorGrading: '低饱和写实，冷灰蓝与暗红，厚重年代感',
      lighting: '写实硬光与霓虹反光，强明暗',
      cameraLanguage: '宏大都市俯瞰、精密机械特写，强透视',
      postTexture: '极密集线条、写实阴影排线、机械细节',
      rhythmEditing: '末世史诗叙事'
    },
    coverPrompt: `A realistic seinen manga illustration in the style of Katsuhiro Otomo, detailed cyberpunk dystopian cityscape with intricate machinery, muted grey-blue and dark red palette, hard realistic shading with dense linework, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-dark-painterly',
    category: '2d',
    name: '暗色调厚涂风格插画',
    bible: {
      reference: '暗色调厚涂插画',
      visualStyle: '暗调厚涂，沉郁氛围，电影感插画，质感厚重',
      colorGrading: '暗调低饱和，暗青褐#2E2A26，局部暖光点，高对比',
      lighting: '低调单光源、伦勃朗式，浓重阴影',
      cameraLanguage: '近景人物氛围、过肩，浅景深感',
      postTexture: '厚涂笔触、粗粝质感、油画肌理',
      rhythmEditing: '沉郁氛围单幅'
    },
    coverPrompt: `A dark moody painterly illustration, a character lit by a single warm light source against deep shadow, low-saturation dark teal-brown palette, thick oil-like brushwork, cinematic atmosphere, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-tezuka',
    category: '2d',
    name: '手冢治虫时代卡通画风',
    bible: {
      reference: '手冢治虫昭和卡通',
      visualStyle: '昭和复古卡通，圆润大眼，怀旧手绘动画',
      colorGrading: '复古中饱和、暖怀旧，赛璐珞平涂',
      lighting: '平面 cel 简单明暗',
      cameraLanguage: '经典动画构图、圆润角色，简洁背景',
      postTexture: '赛璐珞平涂、清晰圆线、轻微做旧',
      rhythmEditing: '昭和动画叙事'
    },
    coverPrompt: `A retro Showa-era cartoon illustration in the style of Osamu Tezuka, round big-eyed characters, nostalgic hand-drawn cel animation look, warm vintage palette, flat cel shading, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-shangmei',
    category: '2d',
    name: '上美画风',
    bible: {
      reference: '上海美术电影制片厂（水墨/民族动画）',
      visualStyle: '上美民族动画，水墨与工笔结合，东方古典韵味',
      colorGrading: '淡雅国风，水墨青绿与赭石，柔和低饱和',
      lighting: '平面写意明暗，无强光源',
      cameraLanguage: '散点国画构图、留白意境，工笔细节',
      postTexture: '水墨晕染 + 工笔线条、宣纸质感',
      rhythmEditing: '诗意写意叙事'
    },
    coverPrompt: `A classic Chinese Shanghai Animation Studio illustration, blending ink-wash and gongbi fine-line painting, elegant jade-green and ochre palette on rice paper, poetic oriental composition with negative space, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-cn-myth',
    category: '2d',
    name: '中国神话风格',
    bible: {
      reference: '中国神话题材插画',
      visualStyle: '东方神话史诗，仙神瑞兽，恢弘瑰丽，国风重彩',
      colorGrading: '重彩国风，朱红#C8302E 与金#D6A84A、青绿，高饱和华丽',
      lighting: '神性光辉与祥云光效，金光逆光',
      cameraLanguage: '恢弘仰视、神话场景纵深，对称庄严',
      postTexture: '工笔重彩 + 描金、流云祥瑞特效',
      rhythmEditing: '史诗神话单幅'
    },
    coverPrompt: `A Chinese mythology illustration, a majestic deity or mythical beast among auspicious clouds, opulent vermilion gold and jade-green palette, divine golden god-light, gongbi heavy-color rendering with gold detailing, grand composition, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-cartoon',
    category: '2d',
    name: '二维卡通插画风格',
    bible: {
      reference: '通用二维卡通插画',
      visualStyle: '现代扁平卡通，简洁可爱，轻松友好，矢量感',
      colorGrading: '明快高饱和、清新，扁平大色块',
      lighting: '平面简单明暗，少阴影',
      cameraLanguage: '简洁居中构图、圆润角色，扁平背景',
      postTexture: '矢量平涂、干净描边、圆角',
      rhythmEditing: '轻松卡通单幅'
    },
    coverPrompt: `A modern 2D flat cartoon illustration, cute friendly rounded characters with clean outlines, bright cheerful flat-color palette, simple flat shading, vector style, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-dark-concept',
    category: '2d',
    name: '黑暗原画概念风格',
    bible: {
      reference: '黑暗系概念原画',
      visualStyle: '黑暗奇幻概念，阴郁恐怖，诡谲氛围，暗黑美学',
      colorGrading: '极暗低饱和，墨黑与血红#7A1620、暗青，高对比',
      lighting: '低调单光、幽光与剪影，浓黑阴影',
      cameraLanguage: '阴森场景纵深、压迫仰视，负空间藏物',
      postTexture: '厚涂粗粝、烟雾血迹、阴郁肌理',
      rhythmEditing: '黑暗氛围单幅'
    },
    coverPrompt: `A dark concept art illustration, an ominous figure in a gloomy horror scene, near-black low-saturation palette with blood-red accents, dim eerie light and silhouettes, gritty painterly texture, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-shadow-puppet',
    category: '2d',
    name: '皮影戏插画风格',
    bible: {
      reference: '中国皮影戏',
      visualStyle: '传统皮影，剪影镂空，平面装饰，民俗韵味',
      colorGrading: '暖琥珀透光#E0A84A 与朱红#C8302E，镂空透光感',
      lighting: '背光透射，剪影与镂空透光',
      cameraLanguage: '平面侧身剪影、装饰排布，舞台感',
      postTexture: '镂空雕花纹样、半透明皮质、平面',
      rhythmEditing: '皮影戏舞台叙事'
    },
    coverPrompt: `A Chinese shadow-puppet style illustration, flat backlit silhouettes with intricate cut-out filigree patterns, warm amber and vermilion translucent palette, decorative stage composition, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-us-dark',
    category: '2d',
    name: '美式黑暗插画风格',
    bible: {
      reference: '美式黑暗插画（恐怖漫画/重金属）',
      visualStyle: '美式暗黑插画，狂野粗犷，恐怖暴力美学，重金属感',
      colorGrading: '暗调高对比，暗红与毒绿、墨黑，低饱和压抑',
      lighting: '强硬光与诡光，浓重阴影',
      cameraLanguage: '夸张动势、低角度威压，冲击构图',
      postTexture: '粗黑描边、厚涂粗粝、墨溅',
      rhythmEditing: '暗黑冲击单幅'
    },
    coverPrompt: `An American dark illustration, a gritty menacing subject in horror-comic heavy-metal style, dark high-contrast palette with deep red and toxic green, harsh eerie light, bold rough inking, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-dark-fantasy',
    category: '2d',
    name: '黑暗奇幻插画风格',
    bible: {
      reference: '黑暗奇幻插画（魂系/哥特奇幻）',
      visualStyle: '黑暗奇幻，宏大阴郁，魔幻生物，史诗压抑',
      colorGrading: '暗冷低饱和，墨青#1E2A2E 与暗金，高对比幽光',
      lighting: '幽暗体积光、冷月光与火光点，浓雾',
      cameraLanguage: '宏大阴郁场景、渺小人物，仰视压迫',
      postTexture: '厚涂写实、雾气尘埃、阴郁材质',
      rhythmEditing: '史诗黑暗氛围'
    },
    coverPrompt: `A dark fantasy illustration, a small figure before a vast gloomy gothic landscape with a mythical creature, cold desaturated teal palette with dim gold, eerie volumetric light and fog, painterly rendering, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-dark-manga',
    category: '2d',
    name: '暗黑漫画风格',
    bible: {
      reference: '暗黑系漫画（伊藤润二式）',
      visualStyle: '暗黑恐怖漫画，密集排线，诡异惊悚，黑白病娇',
      colorGrading: '黑白为主，极密排线灰阶，高对比',
      lighting: 'cel 阴影 + 排线明暗，幽暗',
      cameraLanguage: '诡异特写、扭曲透视，不安构图',
      postTexture: '极密集排线、网点、墨黑块面',
      rhythmEditing: '惊悚漫画格叙事'
    },
    coverPrompt: `A dark horror manga illustration, an unsettling subject with extremely dense hatching and screentone, black-and-white high contrast, eerie distorted composition, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-clean-illust',
    category: '2d',
    name: '简洁插画风格',
    bible: {
      reference: '现代简洁扁平插画',
      visualStyle: '极简扁平插画，几何概括，留白克制，现代设计感',
      colorGrading: '低饱和莫兰迪色，2–3 主色，柔和协调',
      lighting: '平面无光影或极简块面',
      cameraLanguage: '简洁几何构图、大量留白，居中',
      postTexture: '纯色平涂、无描边或细描边，矢量',
      rhythmEditing: '极简单幅'
    },
    coverPrompt: `A minimalist flat illustration, simple geometric shapes with generous negative space, muted Morandi 2-3 color palette, flat no-shadow design, modern clean vector style, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-halftone-gothic',
    category: '2d',
    name: '复古半色调暗色调哥特风格',
    bible: {
      reference: '复古半色调哥特插画',
      visualStyle: '复古哥特，半色调网点，阴郁神秘，老印刷质感',
      colorGrading: '暗调双色调，墨黑与暗红/暗紫，做旧低饱和',
      lighting: '平面戏剧明暗、半色调过渡',
      cameraLanguage: '装饰对称、哥特元素、神秘构图',
      postTexture: '半色调网点、套印错位、纸张做旧',
      rhythmEditing: '复古哥特海报单幅'
    },
    coverPrompt: `A vintage halftone gothic illustration, dark moody duotone of black and deep crimson, halftone dot shading with aged misregistered print texture, decorative gothic composition, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-oriental-ink',
    category: '2d',
    name: '东方水墨画风',
    bible: {
      reference: '东方彩墨写意',
      visualStyle: '东方彩墨写意，飘逸灵动，淡彩晕染，诗意空灵',
      colorGrading: '淡雅彩墨，青绿#7FA890 与淡赭、留白，低饱和清透',
      lighting: '写意明暗、纸面透光，无强光源',
      cameraLanguage: '散点构图、计白当黑，飘逸动势',
      postTexture: '宣纸晕染、淡彩渗化、飞白',
      rhythmEditing: '空灵诗意单幅'
    },
    coverPrompt: `An oriental color ink-wash painting, ethereal flowing subject with light watercolor washes on rice paper, delicate jade-green and ochre tints with negative space, poetic airy mood, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '2d-pixel',
    category: '2d',
    name: '像素风格',
    bible: {
      reference: '像素艺术 pixel art',
      visualStyle: '复古像素，8/16-bit 游戏感，方块颗粒，怀旧电子',
      colorGrading: '有限调色板、高饱和复古，色块分明',
      lighting: '像素抖动 dithering 明暗，硬块阴影',
      cameraLanguage: '横版/斜45°游戏视角、方正构图',
      postTexture: '清晰像素块、抖动渐变、无抗锯齿',
      rhythmEditing: '复古游戏画面'
    },
    coverPrompt: `A retro pixel art scene, 16-bit game style with crisp blocky pixels and dithering, limited saturated palette, hard pixel shading, side-scroller composition, no anti-aliasing, no text, no watermark, 16:10 aspect ratio`
  },

  // ===================== 3D 渲染 =====================
  {
    id: '3d-premium-animation',
    category: '3d',
    name: '高品质动画渲染风格',
    bible: {
      reference: '皮克斯/迪士尼级高品质 3D 动画',
      visualStyle: '电影级 3D 动画，精致角色，温暖治愈，大片质感',
      colorGrading: '明快通透、暖调为主，中高饱和，柔和层次',
      lighting: '电影级全局光照、柔和三点光与环境光，细腻次表面散射',
      cameraLanguage: '电影感运镜、浅景深特写，亲和视角',
      postTexture: '精细 PBR + 卡通化造型，柔顺毛发布料，景深虚化',
      rhythmEditing: '动画大片镜头感'
    },
    coverPrompt: `A premium Pixar-quality 3D animated character in a warm heartwarming scene, polished cinematic global illumination, soft subsurface skin, shallow depth of field, bright appealing palette, high detail 3D render, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '3d-stylized',
    category: '3d',
    name: '3D风格化渲染',
    bible: {
      reference: '风格化 3D（stylized render）',
      visualStyle: '风格化 3D，夸张造型，艺术化比例，介于写实与卡通',
      colorGrading: '鲜明协调、中高饱和，艺术化配色',
      lighting: '艺术化布光、强氛围光与轮廓光',
      cameraLanguage: '动态视角、夸张透视，电影构图',
      postTexture: '半写实材质 + 手绘感贴图，风格化笔触',
      rhythmEditing: '风格化场景单幅'
    },
    coverPrompt: `A stylized 3D render with exaggerated proportions, artistic between-realism-and-cartoon look, vivid balanced palette, dramatic atmospheric and rim lighting, hand-painted-feel textures, high detail 3D render, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '3d-diorama',
    category: '3d',
    name: '3D卡通微缩景观',
    bible: {
      reference: '3D 卡通微缩景观 diorama',
      visualStyle: '可爱微缩景观，迷你世界，移轴玩具感，精致小场景',
      colorGrading: '明快糖果色、高饱和清新，温暖',
      lighting: '柔和均匀棚光、明亮无硬阴影',
      cameraLanguage: '俯视微缩视角、移轴模糊，居中小世界',
      postTexture: '光滑卡通材质、圆润造型、轻微景深',
      rhythmEditing: '萌系微缩单幅'
    },
    coverPrompt: `A cute 3D cartoon miniature diorama, a tiny isometric world with tilt-shift blur, candy-bright cheerful palette, soft even studio lighting, smooth rounded toy-like materials, high detail 3D render, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '3d-western-cartoon-paint',
    category: '3d',
    name: '3D西方卡通风格的绘制',
    bible: {
      reference: '西方卡通 3D 绘制（手绘感）',
      visualStyle: '西方卡通 3D，手绘绘画感，奇幻冒险，温暖故事',
      colorGrading: '丰富暖调、中高饱和，绘画感色彩',
      lighting: '戏剧性绘画式布光、暖逆光，氛围光雾',
      cameraLanguage: '冒险广角场景、英雄视角，电影构图',
      postTexture: '3D 模型 + 手绘 overpaint 贴图，笔触质感',
      rhythmEditing: '冒险故事单幅'
    },
    coverPrompt: `A western cartoon 3D render with a hand-painted look, a fantasy adventure character in an atmospheric scene, rich warm palette, painterly dramatic lighting with backlight, overpainted textures, high detail, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '3d-western-stylized',
    category: '3d',
    name: '欧美风格化3D渲染',
    bible: {
      reference: '欧美风格化 3D（Overwatch 式）',
      visualStyle: '欧美风格化 3D，硬朗设计感，英雄角色，科技奇幻',
      colorGrading: '高饱和鲜明、对比强，标志性配色',
      lighting: '干净明亮布光 + 强轮廓光，清晰高光',
      cameraLanguage: '英雄低角度、动态姿态，清晰构图',
      postTexture: '光滑风格化材质、清晰高光、夸张体块',
      rhythmEditing: '英雄角色单幅'
    },
    coverPrompt: `A western stylized 3D hero character render (Overwatch-like), bold confident design, saturated high-contrast palette, clean bright lighting with strong rim light, smooth stylized materials, dynamic low-angle pose, high detail 3D render, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '3d-digital-sculpt',
    category: '3d',
    name: '3D数字雕刻风格',
    bible: {
      reference: 'ZBrush 数字雕刻',
      visualStyle: '高精数字雕刻，肌理细节，雕塑质感，硬核生物/角色',
      colorGrading: '中性灰泥或单色雕塑感，低饱和，质感优先',
      lighting: '雕塑棚光、强侧光显结构，AO 阴影',
      cameraLanguage: '雕塑特写、转面展示，结构视角',
      postTexture: '极致雕刻细节、毛孔褶皱、clay/PBR 材质',
      rhythmEditing: '雕塑展示单幅'
    },
    coverPrompt: `A high-detail 3D digital sculpt (ZBrush style), an intricately sculpted creature or character with fine surface detail, neutral clay or low-saturation palette, strong sculptural studio side light with ambient occlusion, high detail 3D render, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '3d-cn-hd',
    category: '3d',
    name: '3D国风高清渲染风格',
    bible: {
      reference: '3D 国风高清渲染（古风仙侠）',
      visualStyle: '国风高清 3D，仙侠古风，飘逸华美，东方建筑服饰',
      colorGrading: '清雅国风，青碧与朱金，中高饱和通透',
      lighting: '柔和灵气光 + 暖逆光，氛围光雾',
      cameraLanguage: '飘逸动势、古风场景纵深，电影运镜',
      postTexture: '精细 PBR + 飘动布料发丝、流光特效',
      rhythmEditing: '仙侠唯美单幅'
    },
    coverPrompt: `A high-definition Chinese-style 3D render, an elegant xianxia character in flowing hanfu with spirit-light effects amid oriental architecture, jade-green and cinnabar-gold palette, soft glowing backlight, detailed PBR cloth and hair, high detail 3D render, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '3d-us-cartoon-game',
    category: '3d',
    name: '3D美式卡通游戏美术',
    bible: {
      reference: '美式卡通游戏 3D 美术',
      visualStyle: '美式卡通游戏，活泼夸张，明快可爱，休闲游戏感',
      colorGrading: '高饱和明快、糖果色，强对比',
      lighting: '明亮均匀 + 卡通高光，柔阴影',
      cameraLanguage: '游戏角色展示、动态姿态，清晰构图',
      postTexture: '光滑卡通材质、圆润夸张造型、清晰描边高光',
      rhythmEditing: '游戏角色单幅'
    },
    coverPrompt: `An American cartoon 3D game art character, lively exaggerated playful design, saturated candy palette, bright even lighting with cartoon highlights, smooth rounded materials, high detail 3D render, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '3d-blindbox',
    category: '3d',
    name: '3D盲盒涂装风',
    bible: {
      reference: '潮玩盲盒 3D（POP MART 式）',
      visualStyle: '潮玩盲盒手办，Q 萌大头，光滑涂装，收藏玩具感',
      colorGrading: '柔和马卡龙色、中饱和，温馨',
      lighting: '柔和棚拍光、均匀通透，玩具高光',
      cameraLanguage: '手办居中展示、微俯视，浅景深',
      postTexture: '光滑塑胶/树脂涂装、圆润 Q 版、细腻高光',
      rhythmEditing: '盲盒展示单幅'
    },
    coverPrompt: `A 3D blind-box designer toy figure (POP MART style), cute big-head chibi character with smooth painted finish, soft macaron palette, even studio lighting with toy highlights, glossy resin material, centered display, high detail 3D render, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '3d-cel-shaded',
    category: '3d',
    name: '动漫三渲二风格',
    bible: {
      reference: '动漫三渲二（cel-shaded 3D）',
      visualStyle: '3D 转 2D 动漫感，赛璐珞着色，动漫角色，游戏 CG',
      colorGrading: '动漫鲜明、中高饱和，干净色块',
      lighting: 'cel 卡通着色硬边明暗 + 轮廓光，少渐变',
      cameraLanguage: '动漫动态视角、人物特写，电影构图',
      postTexture: '赛璐珞平涂 + 描边线，3D 模型卡通着色',
      rhythmEditing: '动漫 CG 单幅'
    },
    coverPrompt: `An anime cel-shaded 3D render (toon 3D), a 3D character rendered to look like 2D anime with flat cel shading and outline, vivid clean anime palette, hard-edge toon lighting with rim light, high detail, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '3d-hyperreal',
    category: '3d',
    name: '超现实3D渲染风格',
    bible: {
      reference: '超现实 3D 渲染',
      visualStyle: '超写实 3D，照片级真实，超现实场景，震撼细节',
      colorGrading: '写实自然或戏剧性高级灰，中饱和、电影感',
      lighting: '物理精确全局光照、HDRI 环境光，真实阴影',
      cameraLanguage: '写实镜头、浅景深，电影构图',
      postTexture: '照片级 PBR 材质、微表面细节、真实景深',
      rhythmEditing: '震撼写实单幅'
    },
    coverPrompt: `A hyperreal photorealistic 3D render, a striking surreal scene with photographic realism, cinematic graded palette, physically accurate global illumination and HDRI lighting, ultra-detailed PBR materials, shallow depth of field, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '3d-ue5',
    category: '3d',
    name: 'UE5写实渲染',
    bible: {
      reference: 'Unreal Engine 5 写实渲染',
      visualStyle: 'UE5 实时写实，电影级场景，Nanite/Lumen 质感，游戏 CG',
      colorGrading: '电影级调色、低饱和高级，冷暖对比',
      lighting: 'Lumen 动态全局光、体积雾光束，真实软阴影',
      cameraLanguage: '电影机位、大场景纵深，浅景深',
      postTexture: 'Nanite 超高模、PBR 材质、屏幕空间反射、运动模糊',
      rhythmEditing: '游戏 CG 大场景'
    },
    coverPrompt: `An Unreal Engine 5 photorealistic render, a cinematic environment with Lumen global illumination and volumetric god rays, graded cinematic palette, ultra-detailed Nanite geometry and PBR materials, shallow depth of field, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '3d-guofeng-scene',
    category: '3d',
    name: '国风3D高清渲染风格',
    bible: {
      reference: '国风 3D 高清场景渲染',
      visualStyle: '国风写实 3D 大场景，山水楼阁，恢弘瑰丽，水墨意境融合',
      colorGrading: '青绿山水#3A6A5A 与暖金，中饱和、通透层次',
      lighting: '晨昏氛围光、云雾体积光，柔和暖逆光',
      cameraLanguage: '宏大山水鸟瞰、楼阁纵深，电影广角',
      postTexture: '写实 PBR 建筑山水 + 云雾水墨氛围、细腻',
      rhythmEditing: '国风史诗大场景'
    },
    coverPrompt: `A high-definition Chinese-style 3D landscape render, a grand mountains-and-pavilions scene with ink-wash mist, jade-green and warm-gold palette, dawn atmospheric volumetric light, detailed PBR architecture, cinematic wide aerial view, high detail 3D render, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '3d-toon',
    category: '3d',
    name: '3D卡通渲染风格',
    bible: {
      reference: '通用 3D 卡通渲染',
      visualStyle: '3D 卡通，圆润可爱，明快友好，通用卡通角色',
      colorGrading: '明快高饱和、清新，柔和',
      lighting: '柔和卡通光、明亮均匀，软高光',
      cameraLanguage: '亲和视角、角色居中，简洁场景',
      postTexture: '光滑卡通材质、圆润造型、柔和着色',
      rhythmEditing: '卡通角色单幅'
    },
    coverPrompt: `A 3D cartoon render, a cute rounded friendly character, bright cheerful saturated palette, soft even cartoon lighting with gentle highlights, smooth toon materials, appealing composition, high detail 3D render, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '3d-us-toon',
    category: '3d',
    name: '美国卡通3D渲染风格',
    bible: {
      reference: '美式卡通 3D 渲染（梦工厂式）',
      visualStyle: '美式 3D 卡通，幽默夸张表情，电影动画感，性格鲜明',
      colorGrading: '丰富暖调、中高饱和，电影动画配色',
      lighting: '电影动画布光、柔光 + 轮廓光，氛围光',
      cameraLanguage: '电影感运镜、夸张表情特写，动态构图',
      postTexture: '精细卡通 PBR、夸张造型、柔顺质感',
      rhythmEditing: '动画喜剧镜头感'
    },
    coverPrompt: `An American 3D cartoon render (DreamWorks-like), an expressive humorous character with exaggerated personality, rich warm cinematic palette, animated film lighting with rim light, polished cartoon materials, dynamic framing, high detail 3D render, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '3d-painterly',
    category: '3d',
    name: '3D厚涂风格',
    bible: {
      reference: '3D 厚涂（3D + 手绘 overpaint）',
      visualStyle: '3D 厚涂，绘画质感，3D 结构 + 油画笔触，艺术感',
      colorGrading: '丰富艺术配色、中高饱和，绘画感',
      lighting: '绘画式戏剧光、氛围逆光',
      cameraLanguage: '艺术构图、人物氛围，电影感',
      postTexture: '3D 模型 + 厚涂 overpaint、可见笔触、油画肌理',
      rhythmEditing: '艺术插画单幅'
    },
    coverPrompt: `A 3D painterly render with heavy overpaint, a character with visible oil-paint brushstrokes over 3D structure, rich artistic palette, dramatic painterly lighting with backlight, textured painterly surfaces, high detail, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '3d-pbr-realistic',
    category: '3d',
    name: '3D真实感PBR渲染风格',
    bible: {
      reference: '3D 真实感 PBR 渲染',
      visualStyle: '写实 PBR 渲染，材质真实，质感精准，产品/角色级',
      colorGrading: '自然写实、中性准确，中饱和',
      lighting: '物理 HDRI 环境光、柔和真实阴影，准确反射',
      cameraLanguage: '写实镜头、产品/角色展示，浅景深',
      postTexture: '精准 PBR 材质（金属/粗糙度/法线）、微表面细节',
      rhythmEditing: '写实展示单幅'
    },
    coverPrompt: `A realistic PBR 3D render, a subject with physically accurate materials (metalness, roughness, normal detail), natural neutral palette, HDRI environment lighting with accurate reflections and soft shadows, shallow depth of field, high detail 3D render, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '3d-game-render',
    category: '3d',
    name: '3D游戏渲染风格',
    bible: {
      reference: '3D 游戏引擎渲染',
      visualStyle: '游戏引擎实时渲染，动作场景，游戏 CG 感，硬核质感',
      colorGrading: '中饱和、冷暖对比，游戏级调色',
      lighting: '实时光照 + 轮廓光、特效光，体积雾',
      cameraLanguage: '游戏动作视角、动态姿态，电影构图',
      postTexture: 'PBR 材质 + 特效（粒子/光效）、屏幕空间反射',
      rhythmEditing: '游戏动作单幅'
    },
    coverPrompt: `A 3D game engine render, an action character in a dynamic scene with particle effects, balanced game-graded palette, real-time lighting with rim light and volumetric fog, PBR materials, cinematic action framing, high detail 3D render, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '3d-simple-cartoon-char',
    category: '3d',
    name: '3D人物(简约卡通风)',
    bible: {
      reference: '3D 简约卡通人物',
      visualStyle: '简约 3D 卡通人物，干净极简，圆润可爱，现代设计',
      colorGrading: '低饱和柔和、莫兰迪或马卡龙，2–3 主色',
      lighting: '柔和均匀棚光、极简明暗，软阴影',
      cameraLanguage: '居中简洁展示、微俯视，纯色背景',
      postTexture: '光滑无瑕材质、极简圆润造型、无细节堆砌',
      rhythmEditing: '简约角色单幅'
    },
    coverPrompt: `A simple 3D cartoon character, clean minimal rounded design, soft low-saturation Morandi palette, even gentle studio lighting with soft shadow, smooth flawless materials, centered on plain background, high detail 3D render, no text, no watermark, 16:10 aspect ratio`
  },
  {
    id: '3d-cartoon-animation',
    category: '3d',
    name: '3D卡通动画风格',
    bible: {
      reference: '3D 卡通动画（动画电影感）',
      visualStyle: '3D 卡通动画电影，叙事场景，角色生动，温暖故事感',
      colorGrading: '明快丰富、暖调中高饱和，电影动画配色',
      lighting: '电影动画布光、柔光 + 氛围逆光，温暖光',
      cameraLanguage: '动画电影运镜、场景叙事，浅景深',
      postTexture: '精细卡通 PBR、柔顺毛发布料、圆润造型',
      rhythmEditing: '动画电影镜头感'
    },
    coverPrompt: `A 3D cartoon animation movie still, a lively character in a warm narrative scene, bright rich warm palette, animated-film lighting with soft backlight, polished cartoon materials with soft hair and cloth, shallow depth of field, high detail 3D render, no text, no watermark, 16:10 aspect ratio`
  }
]

export function templatesByCategory(cat: StyleCategory): StyleTemplate[] {
  return STYLE_TEMPLATES.filter((t) => t.category === cat)
}
