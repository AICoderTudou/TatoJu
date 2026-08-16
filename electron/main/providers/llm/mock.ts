import type { LLMProvider, LLMChatRequest, LLMChatResult } from '@shared/types'

// Mock LLM —— 不打外部 API，按 task 返回确定性结构化 JSON，用于无 key 开发与 SELFTEST。
export class MockLLMProvider implements LLMProvider {
  readonly name = 'mock-llm'

  async chat(req: LLMChatRequest): Promise<LLMChatResult> {
    const json = this.build(req)
    const text = typeof json === 'string' ? json : JSON.stringify(json)
    // 模拟流式：分块回调，让"生成过程"浮层在离线/自测下也能演示
    if (req.stream && req.onChunk) {
      const step = Math.max(20, Math.ceil(text.length / 20))
      for (let i = step; i <= text.length; i += step) {
        req.onChunk(text.slice(0, i))
        await new Promise((r) => setTimeout(r, 40))
      }
      req.onChunk(text)
    }
    return { text, json, usage: { in: 100, out: 200 } }
  }

  private build(req: LLMChatRequest): unknown {
    const userText = req.messages.map((m) => m.text ?? '').join('\n')
    switch (req.task) {
      case 'script.generate':
      case 'script.parse':
        return this.script(userText)
      case 'asset.extract':
        return this.assets()
      case 'scene.breakdownSheet':
        return this.breakdownSheet()
      case 'shot.breakdown':
      case 'shot.shotList':
        return this.shots()
      case 'shot.storyboardPrompt':
        return { prompt: this.storyboardPrompt() }
      case 'shot.videoPrompt':
        return this.videoPrompt()
      case 'style.bible':
        return this.styleBible()
      default:
        return { text: '（mock）已收到请求。' }
    }
  }

  private script(userText: string): unknown {
    const genreMatch = userText.match(/题材[:：]\s*(\S+)/)
    const genre = genreMatch ? genreMatch[1] : '都市逆袭'
    return {
      title: `${genre}·样例短剧`,
      outline: {
        genre,
        theme: '当小人物敢于直面羞辱、守住底线时，尊严终将压过权势。',
        logline: '落魄青年被退婚羞辱后获得神秘能力，为夺回尊严与真相一路逆袭打脸豪门。',
        protagonist: '林夜：想要——证明自己配得上爱与尊重；需要——学会不靠他人认可定义自我；创伤——自幼被弃的身世；错误信念——"我天生低人一等"；弧光——从讨好到自立。',
        antagonist: '苏家家主：以门第与金钱碾压他人，是"以出身论价值"的化身，用退婚与羞辱施压。',
        hook: '订婚宴上当众被退婚、被泼酒羞辱的瞬间',
        twists: ['神秘老者赠予能力', '身世反转：其实是隐藏的豪门继承人', '昔日羞辱者反求于他'],
        mainline: '从被羞辱的谷底，借能力与信息差连环打脸，逐步揭开身世并完成阶层与自我的双重反转。'
      },
      episodes: [
        {
          idx: 1,
          title: '退婚风波',
          synopsis: '男主在订婚宴上被退婚羞辱，愤而离场偶遇神秘老者。',
          scenes: [
            {
              idx: 1,
              slugline: 'INT. 酒店宴会厅 - 夜',
              location: '酒店宴会厅',
              timeOfDay: '夜',
              description: '订婚宴上，女方家族当众宣布退婚，宾客哗然，男主强忍屈辱。'
            },
            {
              idx: 2,
              slugline: 'EXT. 酒店后巷 - 夜',
              location: '酒店后巷',
              timeOfDay: '夜',
              description: '男主独自离场，雨夜中遇到一位神秘老者递来一枚古玉。'
            }
          ]
        },
        {
          idx: 2,
          title: '初露锋芒',
          synopsis: '男主获得能力后在公司力挽狂澜，初次打脸看不起他的同事。',
          scenes: [
            {
              idx: 1,
              slugline: 'INT. 公司会议室 - 日',
              location: '公司会议室',
              timeOfDay: '日',
              description: '危机会议上男主提出方案逆转局势，众人惊愕。'
            }
          ]
        }
      ]
    }
  }

  private assets(): unknown {
    return {
      characters: [
        {
          name: '林夜',
          description:
            '男主/逆袭者，28岁，情绪功能=隐忍的复仇者，视觉签名=深灰旧西装+冷峻眼神，一致性重要度高。配色：暖小麦肤色、墨黑短发、深石墨灰旧西装。',
          t2iPrompt:
            '专业角色设定图：28岁亚洲男性，方正脸型，暖小麦肤色，墨黑短发，精瘦挺拔，穿略陈旧的深石墨灰西装，表情坚毅冷峻；多视角 turnaround——正面、3⁄4 侧、侧面、背面；细节特写：面部、发丝、手部；中性影棚主光5000K加柔光填充，简洁浅灰纯色背景，角色设定图网格排版并标注各视角；一致性锁定：脸型/发型/服装不变；no text, no labels, no color codes, no watermark, no cartoon or anime, no extra accessories, no second character'
        },
        {
          name: '苏念',
          description:
            '女主，26岁，情绪功能=清冷的豪门千金，视觉签名=米杏色礼服+珍珠耳饰，一致性重要度高。配色：象牙肤色、乌黑长直发、米杏色礼服。',
          t2iPrompt:
            '专业角色设定图：26岁亚洲女性，鹅蛋脸，象牙肤色，乌黑长直发，纤细身形，米杏色高定礼服、珍珠耳饰，气质清冷；多视角 turnaround——正面、3⁄4 侧、侧面、背面；细节特写：面部、发丝、手部；中性影棚主光5000K加柔光填充，简洁浅灰背景，角色设定图网格排版并标注各视角；一致性锁定：脸型/发型/服装不变；no text, no labels, no color codes, no watermark, no cartoon or anime, no second character'
        }
      ],
      scenes: [
        {
          name: '酒店宴会厅',
          description: '奢华订婚宴现场',
          t2iPrompt:
            '豪华酒店宴会厅，水晶吊灯，金色调装饰，圆桌与香槟塔，暖色氛围光，景深虚化人群，电影感，9:16'
        }
      ],
      props: [
        {
          name: '古玉',
          description: '神秘老者所赠的传家古玉',
          t2iPrompt: '一枚温润的青色古玉佩，雕刻云纹，微微泛光，黑色绒布背景，特写，柔光，高细节'
        }
      ]
    }
  }

  private breakdownSheet(): unknown {
    return {
      sceneGoal: '男主在退婚羞辱中守住尊严',
      valueShift: '体面→当众受辱',
      elements: [
        { category: 'cast', name: '林夜', note: '强忍屈辱' },
        { category: 'cast', name: '苏念', note: '' },
        { category: 'setDressing', name: '酒店宴会厅', note: '订婚宴现场' },
        { category: 'prop', name: '香槟杯', note: '被泼酒' },
        { category: 'sound', name: '宾客哗然', note: '' }
      ],
      beats: [
        { idx: 1, summary: '宴会进行，男主立于人群', beatType: 'setup', valueShift: '体面', dialogueRefs: [] },
        { idx: 2, summary: '女方当众宣布退婚', beatType: 'turn', valueShift: '体面→受辱', dialogueRefs: [] },
        { idx: 3, summary: '男主强忍，握拳', beatType: 'reaction', valueShift: '受辱', dialogueRefs: [] }
      ]
    }
  }

  private shots(): unknown {
    return {
      shots: [
        {
          idx: 1,
          beatIdx: 1,
          shotSize: '全景',
          cameraAngle: '平视',
          cameraMove: '固定',
          lens: '35mm',
          subjectInFrame: '宴会厅与人群中的男主',
          screenDirection: '面朝画右',
          eyeline: '平视前方',
          axisSide: 'N',
          durationSec: 4,
          soundType: 'sync',
          audioCue: '宴会低语',
          dialogue: '',
          dialogueRefs: [],
          action: '宴会厅全景，宾客云集，男主立于人群中央。',
          continuityNotes: ''
        },
        {
          idx: 2,
          beatIdx: 2,
          shotSize: '近景',
          cameraAngle: '平视',
          cameraMove: '推',
          lens: '50mm 标准',
          subjectInFrame: '女方家长',
          screenDirection: '面朝画左',
          eyeline: '看向画右的男主',
          axisSide: 'L',
          durationSec: 3,
          soundType: 'sync',
          audioCue: '',
          dialogue: '我们林家，配不上你苏家。',
          dialogueRefs: [],
          action: '女方家长冷脸宣布退婚，镜头缓推。',
          continuityNotes: ''
        },
        {
          idx: 3,
          beatIdx: 3,
          shotSize: '特写',
          cameraAngle: '仰拍',
          cameraMove: '固定',
          lens: '85mm 人像',
          subjectInFrame: '男主拳头与面部',
          screenDirection: '面朝画左',
          eyeline: '垂眸',
          axisSide: 'R',
          durationSec: 3,
          soundType: 'MOS',
          audioCue: '心跳与呼吸',
          dialogue: '',
          dialogueRefs: [],
          action: '男主紧握的拳头与隐忍的面部特写。',
          continuityNotes: '与上镜视线匹配'
        }
      ]
    }
  }

  private storyboardPrompt(): string {
    return '中景，28岁亚洲男性短黑发深灰西装（林夜），立于豪华酒店宴会厅水晶吊灯下，神情隐忍，暖金色氛围光，浅景深虚化宾客，电影级布光，9:16竖构图'
  }

  private videoPrompt(): unknown {
    const prompt = `═══ 参考素材 ═══
@图片1作为首帧，定下整体画风。全程脸/发型/服装与首帧保持一致。

═══ 整体描述 ═══
都市逆袭，4秒，9:16 竖屏，35mm 胶片质感、细微颗粒，暖金主色调、3200K，4:1 高对比，电影级色彩分级，克制内敛的呼吸式节奏。

═══ 分镜描述 ═══
0-4秒|近景
豪华宴会厅暖金灯光下，男性主角微微抬头、拳头缓缓握紧，镜头缓慢推近，硬光勾勒轮廓。

═══ 声音说明 ═══
环境音从 0 秒持续到 4 秒，无间断、无静默：宴会厅低声交谈与杯盏轻碰，渐弱衬出主角呼吸。无背景音乐，无配乐。

═══ 否定 ═══
角色不可偏离首帧（脸/发/服装锁定），保持构图，避免换脸，无文字叠加无水印，避免画面抖动、肢体扭曲，整段无静默间隙，仅主角一人。`
    return {
      fields: {
        shot: '近景',
        subject: '隐忍的男性主角',
        action: '抬头并缓缓握紧拳头',
        environment: '豪华宴会厅，夜，暖金灯光',
        camera: '缓慢推近',
        lighting: '硬光勾勒轮廓',
        style: '电影级色彩分级'
      },
      prompt
    }
  }

  private styleBible(): unknown {
    return {
      reference: '《教父》暖褐调 + 戈登·威利斯低调布光',
      visualStyle: '复古都市犯罪片质感，1970s 胶片气息，沉稳克制；参考《教父》《现代启示录》《银翼杀手2049》',
      colorGrading: '主色暖褐 #6B4A2B，辅色冷青 #2E4A4A，禁用高饱和荧光色，色温 3200K 暖，4:1 高对比，低饱和',
      lighting: '低调布光，伦勃朗式侧顶光，光比 1:4，阴影浓重保留细节，无频闪',
      cameraLanguage: '35mm 定焦为主，缓慢推拉与锁定，中近景叙事，竖屏 9:16 居中构图，浅景深',
      postTexture: '细微 35mm 胶片颗粒(中等强度)，轻微柔焦高光，暖褐调滤镜',
      rhythmEditing: '沉稳缓燃，平均每段 6 个镜头，硬切为主、关键处叠化，节奏锚点落在情绪转折'
    }
  }
}
