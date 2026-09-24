// 对外导出：组件、组合式、纯函数、全部类型
import './styles.css'

export { default as NoteSidebar } from './components/NoteSidebar.vue'
export { default as FolderTree } from './components/FolderTree.vue'

export {
  useNotes,
  buildFolderTree,
  filterNotes,
  sortNotes,
  matchKeywords,
} from './composables/useNotes'
export type { FilterOptions } from './composables/useNotes'

export type {
  NoteDoc,
  SidebarNote,
  FolderNode,
  NoteSidebarProps,
  NoteSidebarEmits,
} from './types'
