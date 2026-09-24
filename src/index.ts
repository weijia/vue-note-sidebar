// 对外导出：组件、组合式、纯函数、全部类型
import './styles.css'
import NoteSidebar from './components/NoteSidebar.vue'
import FolderTree from './components/FolderTree.vue'

// 同时提供默认导出（组件）与命名导出，兼容 `import NoteSidebar` 与 `import { NoteSidebar }`
export { NoteSidebar, FolderTree }
export default NoteSidebar

export {
  useNotes,
  buildFolderTree,
  filterNotes,
  sortNotes,
  matchKeywords,
  aggregateTags,
} from './composables/useNotes'
export type { FilterOptions, TagCount } from './composables/useNotes'

export type {
  NoteDoc,
  SidebarNote,
  FolderNode,
  NoteSidebarProps,
  NoteSidebarEmits,
} from './types'
