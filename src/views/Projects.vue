<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, type CSSProperties } from 'vue'
import { useRouter } from 'vue-router'
import WindowControls from '../components/WindowControls.vue'
import NewProjectDialog from '../components/NewProjectDialog.vue'
import ImagePreview, { type PreviewItem } from '../components/ImagePreview.vue'
import logoUrl from '../asset/logo.png'
import { HOME_CASES, type HomeCase } from '@shared/homeCases'

const router = useRouter()
const showCreate = ref(false)

const bgVideo = ref<string>(import.meta.env.DEV ? '/hero-bg.mp4' : './hero-bg.mp4')
const cases = ref<HomeCase[]>(HOME_CASES)
const activeIndex = ref(0)
const preview = ref<{ open: boolean; items: PreviewItem[]; index: number }>({
  open: false,
  items: [],
  index: 0
})
let timer: number | undefined

const steps = [
  { no: '01', title: '写剧本', desc: '随机生成或上传小说，AI 改编成竖屏短剧。' },
  { no: '02', title: '出资源', desc: '提取角色、场景、道具，生成设定图并锁定一致性。' },
  { no: '03', title: '做分镜', desc: '拆场景、排镜头表，引用资源生成分镜图。' },
  { no: '04', title: '生成视频', desc: '分镜图加 Seedance 提示词，产出视频碎片。' }
]

function onCreate(): void {
  showCreate.value = true
}

function posterUrl(c: HomeCase): string {
  return (import.meta.env.DEV ? '/' : './') + `cases/${c.id}.webp`
}

function posterCover(c: HomeCase): string {
  return `linear-gradient(160deg, hsl(${c.hue} 60% 30%), hsl(${(c.hue + 30) % 360} 55% 10%))`
}

function offsetOf(i: number): number {
  const n = cases.value.length
  let off = i - activeIndex.value
  if (off > n / 2) off -= n
  if (off < -n / 2) off += n
  return off
}

function coverStyle(i: number): CSSProperties {
  const off = offsetOf(i)
  const abs = Math.abs(off)
  return {
    transform: `translate(-50%, -50%) translateX(${off * 150}px) translateZ(${-abs * 110}px) rotateY(${-off * 34}deg) scale(${Math.max(0.62, 1 - abs * 0.12)})`,
    zIndex: 100 - abs,
    opacity: abs >= 3 ? 0 : 1 - abs * 0.3,
    pointerEvents: abs >= 3 ? 'none' : 'auto'
  }
}

function go(i: number): void {
  activeIndex.value = (i + cases.value.length) % cases.value.length
}

function handlePoster(i: number): void {
  if (i !== activeIndex.value) {
    go(i)
    return
  }
  preview.value = {
    open: true,
    index: i,
    items: cases.value.map((c) => ({
      src: posterUrl(c),
      filePath: `cases/${c.id}.webp`,
      scope: 'app',
      type: 'image',
      title: c.title,
      sub: c.tag
    }))
  }
}

onMounted(() => {
  timer = window.setInterval(() => {
    activeIndex.value = (activeIndex.value + 1) % cases.value.length
  }, 2800)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="home">
    <div class="bg-layer">
      <div class="flow-bg" />
      <video
        v-if="bgVideo"
        class="hero-bg"
        :src="bgVideo"
        autoplay
        loop
        muted
        playsinline
        @error="bgVideo = ''"
      />
      <div class="hero-mask" />
    </div>

    <header class="top app-dragbar">
      <button class="brand clickable" @click="router.push('/')">
        <img class="logo-img" :src="logoUrl" alt="logo" />
        <span class="brand-name h-display">土豆AI短剧</span>
      </button>
      <nav class="topnav">
        <span class="nav-link clickable active">首页</span>
        <span class="nav-link clickable" @click="router.push('/works')">我的作品</span>
      </nav>
      <button class="btn ghost" @click="router.push('/settings')">全局设置</button>
      <WindowControls />
    </header>

    <main class="body">
      <section class="hero">
        <p class="hero-kicker">AI SHORT DRAMA STUDIO</p>
        <h1 class="hero-title h-display">用土豆AI做爆款短剧</h1>
        <p class="hero-sub">从剧本、角色、场景到分镜视频，一站式完成创作。</p>
        <div class="hero-actions">
          <button class="btn primary hero-btn" @click="onCreate">开始创作</button>
          <button class="btn hero-btn ghost-line" @click="router.push('/works')">我的作品</button>
        </div>
      </section>

      <section class="stage">
        <div class="coverflow">
          <button
            v-for="(c, i) in cases"
            :key="c.id"
            class="poster cf-poster"
            :class="{ active: i === activeIndex }"
            :style="{ ...coverStyle(i), background: posterCover(c) }"
            :aria-label="i === activeIndex ? `预览 ${c.title}` : `查看 ${c.title}`"
            @click="handlePoster(i)"
          >
            <img
              class="poster-img"
              :src="posterUrl(c)"
              alt=""
              @load="($event.target as HTMLImageElement).style.opacity = '1'"
              @error="($event.target as HTMLImageElement).style.opacity = '0'"
            />
            <span class="poster-ai">AI 主创</span>
            <div class="poster-foot">
              <div class="poster-title h-display">{{ c.title }}</div>
              <div class="poster-tag">{{ c.tag }}</div>
            </div>
          </button>
          <div class="cf-dots">
            <button
              v-for="(c, i) in cases"
              :key="c.id"
              class="cf-dot clickable"
              :class="{ on: i === activeIndex }"
              :aria-label="`查看 ${c.title}`"
              @click="go(i)"
            />
          </div>
        </div>
      </section>

      <section class="flow">
        <span class="flow-tag label">创作流程</span>
        <div class="flow-track">
          <template v-for="(s, i) in steps" :key="s.no">
            <div class="fstep">
              <span class="fno h-display">{{ s.no }}</span>
              <div class="fbody">
                <div class="ft h-display">{{ s.title }}</div>
                <div class="fd">{{ s.desc }}</div>
              </div>
            </div>
            <span v-if="i < steps.length - 1" class="fconn" aria-hidden="true" />
          </template>
        </div>
      </section>
    </main>

    <NewProjectDialog :open="showCreate" @close="showCreate = false" />
    <ImagePreview
      :open="preview.open"
      :items="preview.items"
      :index="preview.index"
      @close="preview.open = false"
      @update:index="preview.index = $event"
    />
  </div>
</template>

<style scoped>
.home {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.bg-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.flow-bg {
  position: absolute;
  inset: 0;
  background-color: #04060a;
  overflow: hidden;
}

.flow-bg::before {
  content: "";
  position: absolute;
  inset: -25%;
  background:
    radial-gradient(38% 50% at 22% 28%, rgba(52, 224, 139, 0.34), transparent 60%),
    radial-gradient(34% 46% at 82% 64%, rgba(45, 212, 191, 0.26), transparent 60%),
    radial-gradient(40% 52% at 62% 10%, rgba(40, 110, 240, 0.22), transparent 62%),
    radial-gradient(30% 42% at 38% 86%, rgba(124, 92, 255, 0.16), transparent 60%);
  filter: blur(12px);
  animation: auroraDrift 24s ease-in-out infinite alternate;
}

.flow-bg::after {
  content: "";
  position: absolute;
  inset: -60%;
  background: repeating-linear-gradient(
    115deg,
    transparent 0 70px,
    rgba(120, 240, 180, 0.05) 70px 72px,
    transparent 72px 150px
  );
  mix-blend-mode: screen;
  animation: streak 16s linear infinite;
}

.hero-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}

.hero-mask {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(180deg, rgba(4, 6, 8, 0.48) 0%, rgba(4, 6, 8, 0.28) 42%, rgba(4, 6, 8, 0.84) 100%);
}

.top {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 12px 12px 12px 28px;
  background: rgba(8, 10, 12, 0.62);
  border-bottom: 1px solid var(--hair);
  backdrop-filter: blur(12px);
  position: relative;
  z-index: 2;
  flex: 0 0 auto;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.logo-img {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  object-fit: cover;
  box-shadow: var(--accent-glow);
}

.brand-name {
  font-size: 16px;
}

.topnav {
  display: flex;
  gap: 22px;
  flex: 1;
}

.nav-link {
  font-size: 14px;
  color: var(--dim);
  cursor: pointer;
  position: relative;
  padding: 4px 0;
}

.nav-link:hover,
.nav-link.active {
  color: var(--text);
}

.nav-link.active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 2px;
  border-radius: 2px;
  background: var(--accent-grad);
}

.body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 28px 18px;
  position: relative;
  z-index: 1;
  overflow: hidden;
}

.hero {
  flex: 0 0 auto;
  text-align: center;
  padding-top: 8px;
}

.hero-kicker {
  margin: 0 0 8px;
  color: var(--accent);
  font-size: 12px;
  letter-spacing: 0.2em;
  font-weight: 700;
}

.hero-title {
  font-size: 38px;
  margin: 0 0 8px;
  color: #fff;
  text-shadow: 0 2px 30px rgba(0, 0, 0, 0.6);
}

.hero-sub {
  color: rgba(255, 255, 255, 0.82);
  font-size: 14px;
  margin: 0 0 16px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.hero-btn {
  height: 44px;
  padding: 0 28px;
  font-size: 15px;
  border-radius: 999px;
}

.ghost-line {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.25);
  color: #fff;
}

.ghost-line:hover {
  background: rgba(255, 255, 255, 0.12);
}

.stage {
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  z-index: 2;
}

.coverflow {
  position: relative;
  height: 100%;
  width: 100%;
  perspective: 1500px;
  transform-style: preserve-3d;
}

.poster {
  position: relative;
  border: 0;
  border-radius: 12px;
  overflow: hidden;
  color: var(--text);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45);
}

.cf-poster {
  position: absolute;
  left: 50%;
  top: 46%;
  height: 78%;
  aspect-ratio: 2 / 3;
  cursor: pointer;
  will-change: transform, opacity;
  transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.55s ease;
}

.cf-poster::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(2, 4, 6, 0.46);
  transition: background 0.5s ease;
  z-index: 1;
}

.cf-poster.active {
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.6), var(--accent-glow);
}

.cf-poster.active::after {
  background: transparent;
}

.poster-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 0;
}

.poster-ai {
  position: absolute;
  top: 7px;
  left: 7px;
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  backdrop-filter: blur(4px);
  z-index: 2;
}

.poster-foot {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 18px 10px 10px;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.78));
  z-index: 2;
}

.poster-title {
  font-size: 14px;
  color: #fff;
}

.poster-tag {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 2px;
}

.cf-dots {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  gap: 7px;
  z-index: 20;
}

.cf-dot {
  width: 7px;
  height: 7px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.28);
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.cf-dot.on {
  background: var(--accent);
  transform: scale(1.3);
}

.flow {
  flex: 0 0 auto;
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: 14px 18px;
  background: linear-gradient(180deg, rgba(20, 24, 27, 0.42), rgba(14, 17, 19, 0.72));
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  backdrop-filter: blur(10px);
}

.flow::before {
  content: "";
  position: absolute;
  left: 18px;
  right: 18px;
  top: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(52, 224, 139, 0.45), transparent);
}

.flow-tag {
  align-self: center;
  flex-shrink: 0;
  writing-mode: vertical-rl;
  letter-spacing: 0.22em;
  color: var(--accent);
  opacity: 0.85;
  padding-right: 4px;
  border-right: 1px solid var(--hair);
}

.flow-track {
  flex: 1;
  display: flex;
  align-items: stretch;
}

.fstep {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 2px 14px;
}

.fno {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--accent-soft);
  border: 1px solid rgba(52, 224, 139, 0.3);
  color: var(--accent);
  font-size: 15px;
}

.ft {
  font-size: 14px;
  margin-bottom: 2px;
}

.fd {
  font-size: 11.5px;
  color: var(--dim);
  line-height: 1.45;
}

.fconn {
  flex-shrink: 0;
  align-self: center;
  width: 9px;
  height: 9px;
  border-right: 2px solid var(--muted);
  border-top: 2px solid var(--muted);
  transform: rotate(45deg);
}

@keyframes auroraDrift {
  from {
    transform: translate3d(0, 0, 0) scale(1);
    filter: blur(12px) hue-rotate(0deg);
  }
  to {
    transform: translate3d(2.5%, -2%, 0) scale(1.08);
    filter: blur(16px) hue-rotate(26deg);
  }
}

@keyframes streak {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(150px);
  }
}

@media (max-width: 860px) {
  .top {
    gap: 14px;
    padding-left: 16px;
  }

  .topnav {
    gap: 12px;
  }

  .hero-title {
    font-size: 30px;
  }

  .flow-track,
  .hero-actions {
    flex-wrap: wrap;
  }
}

@media (prefers-reduced-motion: reduce) {
  .flow-bg::before,
  .flow-bg::after {
    animation: none;
  }
}
</style>
