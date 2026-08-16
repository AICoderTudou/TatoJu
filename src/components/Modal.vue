<script setup lang="ts">
withDefaults(
  defineProps<{ open: boolean; title?: string; width?: number }>(),
  { title: '', width: 460 }
)
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <transition name="modal">
    <div v-if="open" class="modal-mask" @click.self="emit('close')">
      <div class="modal panel" :style="{ width: width + 'px' }">
        <div v-if="title" class="modal-title h-display">{{ title }}</div>
        <div class="modal-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="modal-actions">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
  backdrop-filter: blur(2px);
}
.modal {
  max-width: 92vw;
  padding: 22px;
}
.modal-title {
  font-size: 17px;
  margin-bottom: 14px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 22px;
}

.modal-enter-active {
  transition: opacity 0.2s ease;
}
.modal-leave-active {
  transition: opacity 0.16s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active .modal {
  transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.26s ease;
}
.modal-leave-active .modal {
  transition: transform 0.16s ease, opacity 0.16s ease;
}
.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: translateY(12px) scale(0.97);
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .modal,
  .modal-leave-active .modal {
    transition: none;
  }
}
</style>
