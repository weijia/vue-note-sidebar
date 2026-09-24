// ============================================================================
// 数据分层规格（详见 docs/design.md）
// 本文件是「组件接口」的单一事实来源：父组件按这些类型传 props，
// 组件按这些类型 emit 事件。组件内部状态不暴露在此。
// ============================================================================

/** 一、最底层：PouchDB 原始笔记文档（存储层，组件不直接依赖 PouchDB） */
export interface NoteDoc {
  _id: string // "note:/工作/项目A/需求文档"
  _rev?: string // PouchDB 自动管理
  type: 'note' // 文档类型标识
  title: string // "需求文档"
  path: string // "/工作/项目A"
  content: string // Markdown 原文
  tags?: string[] // ["重要", "进行中"]
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

/** 二、中间层：父组件派生后传给 Sidebar 的「单个笔记」 */
export interface SidebarNote {
  _id: string // 唯一标识，用于选中高亮与点击
  title: string // 显示标题
  path: string // 所属路径，用于文件夹过滤
  content: string // 原文，用于搜索高亮匹配
  updatedAt?: string // 排序 + 显示用
  createdAt?: string // 可选，显示用
  tags?: string[] // 可选，标签筛选用
}

/** 二、中间层：文件夹树节点（children 用 Record 便于递归插入/遍历） */
export interface FolderNode {
  name: string // 显示名："项目A"
  path: string // 完整路径："/工作/项目A"
  count: number // 该目录笔记数（含子目录）
  children: Record<string, FolderNode> // key = 文件夹名
}

/** 三、Sidebar 组件 props（父组件传入） */
export interface NoteSidebarProps {
  /** 文件夹树：Record<文件夹名, FolderNode> */
  folders: Record<string, FolderNode>
  /** 已过滤、已排序的笔记列表（当前应显示的项） */
  notes: SidebarNote[]
  /** 当前选中笔记 _id，用于高亮 */
  currentNoteId?: string
  /** 当前激活文件夹路径，用于过滤与高亮 */
  activeFolder?: string
  /** 已分词后的搜索关键词，用于 <mark> 高亮（原始输入由 search 事件传出） */
  searchKeywords?: string
  /** 当前激活的标签过滤集合（与 activeFolder 同理，由父组件拥有并回传用于高亮） */
  activeTags?: string[]
  /** 移动端抽屉是否打开（v-model:open 同步用），内部也会自行维护 */
  open?: boolean
}

/** 四、Sidebar 组件 emit 事件（只回传标识符与原始输入） */
export interface NoteSidebarEmits {
  (e: 'select-note', noteId: string): void // 选中笔记 → note._id
  (e: 'select-folder', folderPath: string): void // 选中文件夹 → path
  (e: 'select-tag', tag: string): void // 点标签筛选 → tag（父组件维护 activeTags）
  (e: 'add-tag', noteId: string, tag: string): void // 给当前笔记加标签 → 父组件落库
  (e: 'remove-tag', noteId: string, tag: string): void // 移除当前笔记标签 → 父组件落库
  (e: 'create-note', targetPath: string): void // 新建笔记 → 目标路径
  (e: 'search', rawQuery: string): void // 搜索 → 原始输入字符串
  (e: 'clear-search'): void // 清除搜索 → 无参数
  (e: 'update:open', open: boolean): void // 抽屉状态 → boolean
}
