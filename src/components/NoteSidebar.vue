<template>
  <aside class="nsb" :class="{ 'nsb--open': localOpen }">
    <div v-if="localOpen" class="nsb__backdrop" @click="close"></div>

    <div class="nsb__panel">
      <header class="nsb__header">
        <button v-if="isMobile" class="nsb__close" aria-label="关闭" @click="close">×</button>

        <div class="nsb__search">
          <input
            v-model="searchInput"
            class="nsb__search-input"
            type="text"
            placeholder="搜索笔记…"
            @input="onSearchInput"
          />
          <button v-if="searchInput" class="nsb__search-clear" @click="clearSearch">清除</button>
        </div>

        <button class="nsb__new" @click="onCreateNote">+ 新建</button>
      </header>

      <nav class="nsb__folders">
        <FolderTree
          :nodes="folders"
          :active-folder="activeFolder"
          :expanded="expandedFolders"
          @toggle="toggleFolder"
          @select="onSelectFolder"
        />
      </nav>

      <section class="nsb__tags" v-if="tagList.length">
        <div class="nsb__tags-title">标签</div>
        <div class="nsb__tag-list">
          <button
            v-for="t in tagList"
            :key="t.name"
            type="button"
            class="nsb__tag-chip"
            :class="{ 'nsb__tag-chip--active': isActiveTag(t.name) }"
            @click="onSelectTag(t.name)"
          >
            #{{ t.name }} <span class="nsb__tag-count">{{ t.count }}</span>
          </button>
        </div>
      </section>

      <ul class="nsb__notes">
        <li
          v-for="note in notes"
          :key="note._id"
          class="nsb__note"
          :class="{ 'nsb__note--active': note._id === currentNoteId }"
          @click="onSelectNote(note._id)"
        >
          <span class="nsb__note-title" v-html="highlight(note.title)"></span>
          <span v-if="note.tags?.length" class="nsb__note-tags">
            <span v-for="t in note.tags" :key="t" class="nsb__tag">
              #{{ t }}
              <button
                v-if="note._id === currentNoteId"
                type="button"
                class="nsb__tag-x"
                :aria-label="'移除标签 ' + t"
                @click.stop="onRemoveTag(note._id, t)"
              >×</button>
            </span>
          </span>
          <small v-if="note.updatedAt" class="nsb__note-date">{{ formatDate(note.updatedAt) }}</small>
        </li>
        <li v-if="!notes.length" class="nsb__empty">暂无笔记</li>
      </ul>

      <div v-if="currentNoteId" class="nsb__add-tag">
        <input
          v-model="newTagInput"
          class="nsb__add-tag-input"
          type="text"
          placeholder="给当前笔记加标签…"
          @keyup.enter="onAddTag"
        />
        <button type="button" class="nsb__add-tag-btn" @click="onAddTag">添加</button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import FolderTree from './FolderTree.vue'
import { aggregateTags } from '../composables/useNotes'
import type { NoteSidebarProps, NoteSidebarEmits } from '../types'

const props = withDefaults(defineProps<NoteSidebarProps>(), {
  currentNoteId: '',
  activeFolder: '',
  searchKeywords: '',
  activeTags: () => [],
  open: false,
})

const emit = defineEmits<NoteSidebarEmits>()

// ===== 组件内部状态（父组件无需管理） =====
const expandedFolders = ref<Set<string>>(new Set())
const searchInput = ref('')
const newTagInput = ref('')
const localOpen = ref(props.open)
const isMobile = ref(false)

// 标签面板：从传入的 notes 聚合（含计数）
const tagList = computed(() => aggregateTags(props.notes))

function isActiveTag(tag: string): boolean {
  return (props.activeTags ?? []).includes(tag)
}

function checkMobile() {
  isMobile.value = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
}
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})
onUnmounted(() => window.removeEventListener('resize', checkMobile))

// 父组件通过 v-model:open 控制抽屉
watch(
  () => props.open,
  (v) => {
    localOpen.value = v
  },
)

// ===== 搜索：防抖后 emit 原始字符串，父组件负责分词策略 =====
let debounceTimer: number | undefined
function onSearchInput() {
  window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    emit('search', searchInput.value)
  }, 250)
}

function clearSearch() {
  searchInput.value = ''
  emit('clear-search')
}

// 父组件清空关键词时，同步清空输入框
watch(
  () => props.searchKeywords,
  (kw) => {
    if (!kw) searchInput.value = ''
  },
)

function onSelectNote(id: string) {
  emit('select-note', id)
}

function onSelectFolder(path: string) {
  emit('select-folder', path)
}

function onSelectTag(tag: string) {
  emit('select-tag', tag)
}

function onAddTag() {
  const tag = newTagInput.value.trim()
  if (!tag || !props.currentNoteId) return
  emit('add-tag', props.currentNoteId, tag)
  newTagInput.value = ''
}

function onRemoveTag(noteId: string, tag: string) {
  emit('remove-tag', noteId, tag)
}

function toggleFolder(path: string) {
  const next = new Set(expandedFolders.value)
  if (next.has(path)) next.delete(path)
  else next.add(path)
  expandedFolders.value = next
}

function onCreateNote() {
  emit('create-note', props.activeFolder || '/')
}

function close() {
  localOpen.value = false
  emit('update:open', false)
}

function open() {
  localOpen.value = true
  emit('update:open', true)
}

// ===== 高亮：根据父组件传回的分词结果做 <mark> 包裹 =====
function highlight(text: string): string {
  const kw = (props.searchKeywords ?? '').trim()
  const escaped = escapeHtml(text)
  if (!kw) return escaped
  const tokens = kw.split(/\s+/).filter(Boolean).map(escapeRegExp)
  const re = new RegExp(`(${tokens.join('|')})`, 'gi')
  return escaped.replace(re, '<mark>$1</mark>')
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString()
}

defineExpose({ open, close })
</script>
