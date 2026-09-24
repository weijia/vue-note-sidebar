import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { SidebarNote, FolderNode } from '../types'

/**
 * 由笔记列表派生文件夹树。
 * 为什么 children 用 Record<string, FolderNode> 而不是 Array？
 *  → buildFolderTree 时天然递归插入，Object 比 Array 方便；
 *  → 组件内部 v-for 遍历 Object.values() 即可；
 *  → 如需排序，父组件可在调用前/后处理。
 */
export function buildFolderTree(notes: SidebarNote[]): Record<string, FolderNode> {
  const tree: Record<string, FolderNode> = {}

  for (const note of notes) {
    const parts = (note.path || '/').split('/').filter(Boolean)
    let cur = tree
    let path = ''

    for (const name of parts) {
      path += '/' + name
      if (!cur[name]) {
        cur[name] = { name, path, count: 0,  children: {} }
      }
      cur[name].count++
      cur = cur[name].children
    }
  }

  return tree
}

/** 默认采用 AND 语义：所有关键词 token 都必须命中（父组件可替换策略） */
export function matchKeywords(note: SidebarNote, rawQuery: string): boolean {
  const tokens = rawQuery.toLowerCase().split(/\s+/).filter(Boolean)
  if (!tokens.length) return true
  const haystack = [note.title, note.content, note.path, ...(note.tags ?? [])]
    .join('\n')
    .toLowerCase()
  return tokens.every((tok) => haystack.includes(tok))
}

export interface FilterOptions {
  activeFolder?: string
  keywords?: string
  /** 激活的标签集合：笔记需同时包含全部激活标签（AND） */
  activeTags?: string[]
}

/** 父组件层的过滤：文件夹前缀匹配 + 关键词 AND 匹配 + 标签 AND 匹配 */
export function filterNotes(
  notes: SidebarNote[],
  options: FilterOptions = {},
): SidebarNote[] {
  const kw = (options.keywords ?? '').trim()
  const activeTags = options.activeTags ?? []
  return notes.filter((n) => {
    if (options.activeFolder && !n.path.startsWith(options.activeFolder)) return false
    if (kw && !matchKeywords(n, kw)) return false
    if (activeTags.length) {
      const noteTags = n.tags ?? []
      if (!activeTags.every((t) => noteTags.includes(t))) return false
    }
    return true
  })
}

export interface TagCount {
  name: string
  count: number
}

/** 从笔记列表聚合标签及其出现次数（用于标签面板渲染） */
export function aggregateTags(notes: SidebarNote[]): TagCount[] {
  const map = new Map<string, number>()
  for (const n of notes) {
    for (const t of n.tags ?? []) {
      map.set(t, (map.get(t) ?? 0) + 1)
    }
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/** 按 updatedAt 排序（默认倒序：最新在前） */
export function sortNotes(
  notes: SidebarNote[],
  order: 'desc' | 'asc' = 'desc',
): SidebarNote[] {
  return [...notes].sort((a, b) =>
    order === 'desc'
      ? (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
      : (a.updatedAt ?? '').localeCompare(b.updatedAt ?? ''),
  )
}

/**
 * 组合式封装：把「原始笔记 → 文件夹树 + 可见列表」的逻辑收口在一个 composable，
 * 父组件直接解构使用，无需自己写派生代码。
 */
export function useNotes(
  notes: MaybeRefOrGetter<SidebarNote[]>,
  options: MaybeRefOrGetter<FilterOptions> = {},
) {
  const folders = computed<Record<string, FolderNode>>(() =>
    buildFolderTree(toValue(notes)),
  )
  const visibleNotes = computed<SidebarNote[]>(() =>
    sortNotes(filterNotes(toValue(notes), toValue(options))),
  )
  return { folders, visibleNotes }
}
