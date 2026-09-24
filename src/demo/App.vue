<template>
  <div class="layout">
    <button v-if="isMobile" class="hamburger" @click="sidebarRef?.open()">☰</button>

    <NoteSidebar
      ref="sidebarRef"
      v-model:open="drawerOpen"
      :folders="folders"
      :notes="visibleNotes"
      :current-note-id="currentNoteId"
      :active-folder="activeFolder"
      :active-tags="activeTags"
      :search-keywords="searchKeywords"
      @select-note="onSelectNote"
      @select-folder="onSelectFolder"
      @select-tag="onSelectTag"
      @add-tag="addTag"
      @remove-tag="removeTag"
      @create-note="onCreateNote"
      @search="onSearch"
      @clear-search="onClearSearch"
    />

    <main class="editor">
      <template v-if="current">
        <h2>{{ current.title }}</h2>
        <p class="path">{{ current.path }}</p>
        <pre>{{ current.content }}</pre>
      </template>
      <p v-else class="placeholder">← 从左侧选择或搜索一篇笔记</p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import NoteSidebar from '../components/NoteSidebar.vue'
import { useNotes } from '../composables/useNotes'
import type { SidebarNote } from '../types'

// 模拟「父组件」：这里用本地数组代替 PouchDB allDocs 结果
const allNotes = ref<SidebarNote[]>([
  { _id: '1', title: '需求文档', path: '/工作/项目A', content: '# 登录需求\n支持手机号登录', tags: ['重要'], updatedAt: '2026-01-01T00:00:00Z' },
  { _id: '2', title: '设计稿', path: '/工作/项目A', content: 'Figma 链接', tags: ['进行中'], updatedAt: '2026-03-01T00:00:00Z' },
  { _id: '3', title: '周报', path: '/工作', content: '本周进展', updatedAt: '2026-02-01T00:00:00Z' },
  { _id: '4', title: '子任务', path: '/工作/项目A/子模块', content: '数据库迁移', updatedAt: '2026-04-01T00:00:00Z' },
  { _id: '5', title: '日记', path: '/个人', content: '今天天气好', updatedAt: '2026-02-15T00:00:00Z' },
])

const currentNoteId = ref('')
const activeFolder = ref('')
const activeTags = ref<string[]>([])
const searchKeywords = ref('')
const drawerOpen = ref(false)
const isMobile = ref(typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches)
const sidebarRef = ref<InstanceType<typeof NoteSidebar> | null>(null)

const { folders, visibleNotes } = useNotes(allNotes, () => ({
  activeFolder: activeFolder.value,
  keywords: searchKeywords.value,
  activeTags: activeTags.value,
}))

const current = computed(() => allNotes.value.find((n) => n._id === currentNoteId.value))

function onSelectNote(id: string) {
  currentNoteId.value = id
}
function onSelectFolder(path: string) {
  activeFolder.value = activeFolder.value === path ? '' : path
}
function onSelectTag(tag: string) {
  // 标签过滤是「切换」语义：再点一次取消
  activeTags.value = activeTags.value.includes(tag)
    ? activeTags.value.filter((t) => t !== tag)
    : [...activeTags.value, tag]
}
// 模拟 PouchDB 落库：更新某笔记的 tags
function addTag(noteId: string, tag: string) {
  allNotes.value = allNotes.value.map((n) =>
    n._id === noteId ? { ...n, tags: [...new Set([...(n.tags ?? []), tag])] } : n,
  )
}
function removeTag(noteId: string, tag: string) {
  allNotes.value = allNotes.value.map((n) =>
    n._id === noteId ? { ...n, tags: (n.tags ?? []).filter((t) => t !== tag) } : n,
  )
}
function onCreateNote(path: string) {
  const id = String(Date.now())
  allNotes.value = [
    ...allNotes.value,
    { _id: id, title: '未命名笔记', path, content: '', updatedAt: new Date().toISOString() },
  ]
  currentNoteId.value = id
}
function onSearch(raw: string) {
  // 父组件自己决定分词策略：这里简单地按空白分词回传
  searchKeywords.value = raw.trim()
}
function onClearSearch() {
  searchKeywords.value = ''
}
</script>

<style>
.layout {
  display: flex;
  height: 100vh;
  font-family: system-ui, sans-serif;
}
.editor {
  flex: 1;
  padding: 24px;
  overflow: auto;
}
.path {
  color: #6b7280;
  font-size: 13px;
}
pre {
  white-space: pre-wrap;
  background: #f9fafb;
  padding: 12px;
  border-radius: 8px;
}
.placeholder {
  color: #9ca3af;
}
.hamburger {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 60;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
}
</style>
