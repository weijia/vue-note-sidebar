# 设计文档：vue-note-sidebar

## 1. 架构总览

数据分三层，组件只处于「中间层消费者 + 视图」位置：

```
PouchDB (NoteDoc)
   │ allDocs()
   ▼
父组件 / useNotes 组合式
   ├─ buildFolderTree(notes) → folders
   ├─ filterNotes + sortNotes → visibleNotes
   └─ 维护 currentNoteId / activeFolder / searchKeywords
   │ props                │ emits
   ▼                      ▼
NoteSidebar 组件       父组件事件处理
   props: folders         select-note(id)   → 设 currentNoteId
   props: notes           select-folder(p)  → 设 activeFolder
   props: currentNoteId   search(q)         → 分词 → 重算过滤
   props: activeFolder    create-note(p)    → db.put(...)
   props: searchKeywords  clear-search()    → 清空 keywords
   emits: ...             （再派生成 props 回传组件）
```

## 2. 数据模型

### 2.1 存储层（PouchDB，组件不依赖）
```ts
interface NoteDoc {
  _id: string; _rev?: string; type: 'note';
  title: string; path: string; content: string;
  tags?: string[]; createdAt: string; updatedAt: string;
}
```

### 2.2 组件契约类型（`src/types/index.ts`）
- `SidebarNote`：组件渲染所需的扁平笔记项。
- `FolderNode`：`{ name, path, count, children: Record<string, FolderNode> }`。

## 3. 关键设计决策

### D1：folders 用 `Record<string, FolderNode>` 而非 Array
- 父组件 `buildFolderTree` 时天然递归插入，Object 比 Array 方便。
- 递归渲染时 `v-for` 遍历 `Object.values()` 即可。
- 若需排序，父组件在派生时处理（`FolderTree` 内部也对同级按 `name` 排序）。

### D2：notes 是扁平数组而非树
- 文件夹过滤已在父组件完成，Sidebar 拿到的就是「当前应显示的列表」。
- 排序也在父组件完成，Sidebar 只管渲染 → 保持通用、无副作用。

### D3：search 传「原始字符串」而非分词结果
- 不同应用分词逻辑不同（AND / OR / 模糊）。
- Sidebar 只负责「用户输入了什么」，匹配策略由父组件决定。
- `searchKeywords` prop 才是分词后的结果，仅用于 `<mark>` 高亮。

### D4：组件内部分状态不上升
- `expandedFolders`（展开集合）、`searchInput`（未防抖输入）、`localOpen`（抽屉）均为组件内部 `ref`，不污染父组件。
- 仅通过 `update:open` 把抽屉状态同步给父组件（便于父组件控制汉堡按钮）。

### D5：高亮安全
- `highlight()` 先 `escapeHtml` 再 `replace`，避免 XSS；仅注入 `<mark>`。

### D6：标签操作放进组件，但落库仍在父组件
- **组件内做什么**：聚合标签面板（`aggregateTags`）、标签筛选切换（`select-tag`）、给当前笔记加/去标签（`add-tag` / `remove-tag`）。
- **组件内不做什么**：不直接写 PouchDB、不维护全局标签词表。所有变更都通过 emit 意图，由父组件 `db.put` 落库。
- **过滤归属**：`activeTags` 是「过滤状态」，与 `activeFolder` 同理由父组件拥有并回传高亮；真正过滤在 `useNotes` 的 `filterNotes` 中完成（标签 AND 匹配），不在组件内部。
- 这样既不破坏「组件只传标识符、内部状态不上升」的原则，又让用户能在 Sidebar 里完成标签相关交互。

## 4. 组件拆分

- `NoteSidebar.vue`：主组件。持有 props/emit、内部状态、搜索防抖、抽屉、高亮。
- `FolderTree.vue`：**递归**子组件，仅渲染一层节点并把 `toggle`/`select` 事件向上冒泡。
- `useNotes.ts`：组合式封装，把「原始笔记 → folders + visibleNotes」收口，父组件一行调用。
- `types/index.ts`：全部对外类型。
- `index.ts`：库入口，统一导出组件、组合式、工具函数与类型。

## 5. 构建与发布

- 构建：Vite **library 模式**，外部化 `vue`，产出 ESM + CJS；`vite-plugin-dts` 生成 `index.d.ts`。
- 包导出：`exports` 含主入口与 `./style.css` 样式子路径。
- 自动发布（`.github/workflows/publish.yml`）：
  - 触发：推送 `v*` tag，或发布 GitHub Release。
  - 步骤：`npm ci` → `npm run build` → `npm publish`（依赖仓库 Secret `NPM_TOKEN`）。
- CI（`.github/workflows/ci.yml`）：push/PR 到 main 时安装、构建、测试。

## 6. 使用示例（父组件）

```ts
import { useNotes } from '@weijia/vue-note-sidebar'
import '@weijia/vue-note-sidebar/style.css'

const { folders, visibleNotes } = useNotes(allNotes, () => ({
  activeFolder: activeFolder.value,
  keywords: searchKeywords.value,
}))
// <NoteSidebar :folders="folders" :notes="visibleNotes" ... />
```
