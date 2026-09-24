# @richard432/vue-note-sidebar

一个可复用的 **Vue 3 + TypeScript** 侧边栏组件，用于浏览「以 PouchDB 为存储层」的笔记应用。
组件**不直接依赖 PouchDB**，它只消费父组件派生好的数据，保证通用性与可测试性。

特性：
- 📁 由笔记 `path` 派生的多级文件夹树（含计数）
- 🔍 搜索框（防抖），匹配策略交给父组件，组件仅做 `<mark>` 高亮
- 🏷️ 标签面板：点击筛选（AND）、给当前笔记加/去标签（落库交父组件）
- 📱 响应式：桌面为固定侧栏，移动端为可开合抽屉
- 🧩 内置 `useNotes` 组合式，一行完成「原始笔记 → 文件夹树 + 可见列表」
- 📦 提供 `.d.ts` 类型声明，开箱即用 TypeScript

## 安装

```bash
npm install @richard432/vue-note-sidebar vue
```

## 快速使用

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import NoteSidebar, { useNotes } from '@richard432/vue-note-sidebar'
import '@richard432/vue-note-sidebar/style.css'
import type { SidebarNote } from '@richard432/vue-note-sidebar'

const allNotes = ref<SidebarNote[]>(/* 来自 PouchDB allDocs 的笔记 */)
const activeFolder = ref('')
const activeTags = ref<string[]>([])
const searchKeywords = ref('')
const currentNoteId = ref('')

// 一行派生：文件夹树 + 过滤排序后的笔记列表
const { folders, visibleNotes } = useNotes(allNotes, () => ({
  activeFolder: activeFolder.value,
  activeTags: activeTags.value,
  keywords: searchKeywords.value,
}))

// 标签筛选（切换语义）
function onSelectTag(tag: string) {
  activeTags.value = activeTags.value.includes(tag)
    ? activeTags.value.filter((t) => t !== tag)
    : [...activeTags.value, tag]
}
// 加/去标签后落库（此处以本地数组模拟 db.put）
function addTag(id: string, tag: string) {
  allNotes.value = allNotes.value.map((n) =>
    n._id === id ? { ...n, tags: [...new Set([...(n.tags ?? []), tag])] } : n,
  )
}
function removeTag(id: string, tag: string) {
  allNotes.value = allNotes.value.map((n) =>
    n._id === id ? { ...n, tags: (n.tags ?? []).filter((t) => t !== tag) } : n,
  )
}
</script>

<template>
  <NoteSidebar
    :folders="folders"
    :notes="visibleNotes"
    :current-note-id="currentNoteId"
    :active-folder="activeFolder"
    :active-tags="activeTags"
    :search-keywords="searchKeywords"
    @select-note="(id) => (currentNoteId = id)"
    @select-folder="(p) => (activeFolder = p)"
    @select-tag="onSelectTag"
    @add-tag="addTag"
    @remove-tag="removeTag"
    @search="(q) => (searchKeywords = q)"
    @create-note="(p) => console.log('new note under', p)"
  />
</template>
```

## 数据接口

### Props
| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `folders` | `Record<string, FolderNode>` | 文件夹树 |
| `notes` | `SidebarNote[]` | 已过滤、已排序的笔记列表 |
| `currentNoteId` | `string?` | 当前选中高亮 |
| `activeFolder` | `string?` | 当前激活文件夹路径 |
| `activeTags` | `string[]?` | 当前激活标签集合（过滤/高亮） |
| `searchKeywords` | `string?` | 分词后关键词，用于高亮 |
| `open` | `boolean?` | 抽屉开关（`v-model:open`） |

### Emits
| 事件 | 载荷 | 说明 |
| --- | --- | --- |
| `select-note` | `string` | 选中笔记 `_id` |
| `select-folder` | `string` | 选中文件夹 `path` |
| `select-tag` | `string` | 点标签筛选（`tag`） |
| `add-tag` | `string, string` | 给当前笔记加标签（`noteId, tag`） |
| `remove-tag` | `string, string` | 移除当前笔记标签（`noteId, tag`） |
| `create-note` | `string` | 新建笔记目标路径 |
| `search` | `string` | 搜索原始输入 |
| `clear-search` | `void` | 清除搜索 |
| `update:open` | `boolean` | 抽屉状态同步 |

## 标签功能

组件内置完整的标签交互，但**不直接修改存储**——所有写操作都通过事件回传给父组件落库（与「组件只 emit 意图」的设计一致）。

### 1. 标签筛选面板（只读聚合）
组件从传入的 `notes` 自动聚合所有标签及其出现次数（`aggregateTags(notes)`），渲染为可点击的 chips，并显示每个标签的命中笔记数。
- 点击某个标签 → `emit('select-tag', tag)`，父组件切换 `activeTags`（再点一次取消，切换语义）。
- 过滤采用 **AND** 语义：笔记需**同时包含** `activeTags` 中的全部标签，由 `useNotes` 统一处理。
- 激活的标签会在面板中高亮，并作用于笔记列表过滤与高亮。

### 2. 给当前笔记加标签
选中某条笔记后，在底部输入框回车或点击「添加」→ `emit('add-tag', noteId, tag)`。
父组件负责去重并落库（如 `db.put({ ...doc, tags: [...new Set([...doc.tags ?? [], tag])] })`）。

### 3. 移除当前笔记标签
选中笔记的标签 chip 上的「×」→ `emit('remove-tag', noteId, tag)`。
父组件负责从数组中移除并落库。

### 标签相关接口一览
| 名称 | 方向 | 类型 / 载荷 | 说明 |
| --- | --- | --- | --- |
| `activeTags` | prop | `string[]?` | 当前激活标签集合，用于过滤与高亮（**父组件拥有**） |
| `select-tag` | emit | `(tag: string)` | 点击标签筛选 |
| `add-tag` | emit | `(noteId: string, tag: string)` | 给当前笔记加标签 |
| `remove-tag` | emit | `(noteId: string, tag: string)` | 移除当前笔记标签 |

> 组合式 `useNotes` 已内置标签 AND 过滤；聚合函数 `aggregateTags(notes)` 也可单独用于自定义面板。

## 文档
- [需求文档](./docs/requirements.md)
- [设计文档](./docs/design.md)

## 本地开发

```bash
npm install
npm run dev      # 启动 demo
npm run build    # 类型检查 + 构建库
npm test         # 单元测试
```

## 自动发布

推送 `v*` tag 或发布 GitHub Release 时，GitHub Actions 会自动 `npm publish`。
需要在仓库 `Settings → Secrets` 配置 `NPM_TOKEN`（npm 账号的 Automation 类型 token）。

## License

MIT
