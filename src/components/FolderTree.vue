<template>
  <ul class="nsb-tree">
    <li v-for="node in nodesList" :key="node.path" class="nsb-tree__item">
      <div
        class="nsb-tree__row"
        :class="{ 'nsb-tree__row--active': node.path === activeFolder }"
      >
        <button
          class="nsb-tree__toggle"
          :class="{ 'nsb-tree__toggle--expanded': isExpanded(node.path) }"
          :aria-label="isExpanded(node.path) ? '收起' : '展开'"
          @click="onToggle(node.path)"
        >
          ▶
        </button>
        <span class="nsb-tree__label" @click="onSelect(node.path)">
          <span class="nsb-tree__icon">📁</span>
          <span class="nsb-tree__name">{{ node.name }}</span>
          <span class="nsb-tree__count">({{ node.count }})</span>
        </span>
      </div>

      <FolderTree
        v-if="isExpanded(node.path) && hasChildren(node)"
        :nodes="node.children"
        :active-folder="activeFolder"
        :expanded="expanded"
        @toggle="emit('toggle', $event)"
        @select="emit('select', $event)"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import type { FolderNode } from '../types'
import { logTree } from '../debug'

const props = defineProps<{
  nodes: Record<string, FolderNode>
  activeFolder?: string
  expanded: Set<string>
}>()

const emit = defineEmits<{
  (e: 'toggle', path: string): void
  (e: 'select', path: string): void
}>()

// 文件夹按名称排序，保证渲染稳定
const nodesList = computed(() =>
  Object.values(props.nodes).sort((a, b) => a.name.localeCompare(b.name)),
)

function isExpanded(path: string): boolean {
  return props.expanded.has(path)
}

function hasChildren(node: FolderNode): boolean {
  return Object.keys(node.children).length > 0
}

// 事件统一走这里，便于记录调试日志
function onToggle(path: string): void {
  logTree.log('emit toggle', path)
  emit('toggle', path)
}

function onSelect(path: string): void {
  logTree.log('emit select', path)
  emit('select', path)
}

onMounted(() => {
  logTree.log('mounted', { nodes: nodesList.value.length, activeFolder: props.activeFolder })
})

onUnmounted(() => logTree.log('unmounted'))
</script>
