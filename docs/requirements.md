# 需求文档：vue-note-sidebar

## 1. 背景与目标

我们需要一个可复用的 Vue 3 侧边栏组件，用于浏览「以 PouchDB 为存储层」的笔记应用。
组件本身**不直接依赖 PouchDB**，它只消费父组件派生好的数据，保证通用性与可测试性。

目标：
- 提供笔记列表（过滤 + 排序后）展示与选中。
- 提供文件夹树（由笔记 path 派生）展示、展开/收起、按文件夹过滤。
- 提供搜索框（防抖），原始输入回传父组件，由父组件决定分词/匹配策略；组件仅负责高亮。
- 响应式：桌面为固定侧栏，移动端为可开合抽屉。
- 作为 npm 包发布，支持 TypeScript 类型。

## 2. 角色与边界

- **存储层（PouchDB）**：持有 `NoteDoc` 原始文档，组件不碰。
- **父组件 / composable**：负责 `allDocs → 派生 folders + 过滤排序 notes → 作为 props 传入`。
- **Sidebar 组件**：纯展示 + 交互，只 emit 标识符与原始输入。

## 3. 功能需求

### FR-1 笔记列表
- 接收 `notes: SidebarNote[]`（已过滤、已排序），渲染列表。
- 点击某条笔记 → emit `select-note` 并带上 `note._id`。
- 当前选中项（`currentNoteId`）高亮。

### FR-2 文件夹树
- 接收 `folders: Record<string, FolderNode>`（由父组件 `buildFolderTree` 派生）。
- 支持多级递归渲染，显示文件夹名与笔记计数。
- 展开/收起为**组件内部状态**（`expandedFolders: Set<string>`），不上升父组件。
- 点击文件夹 → emit `select-folder` 并带上 `path`。

### FR-3 搜索
- 输入框为**组件内部状态**（`searchInput`），输入防抖（250ms）后 emit `search` 原始字符串。
- 父组件清洗/分词后，通过 `searchKeywords` prop 回传，组件据此对标题做 `<mark>` 高亮。
- 「清除」按钮 → emit `clear-search`（无参），并同步清空输入框。

### FR-4 新建笔记
- 「+ 新建」按钮 → emit `create-note` 并带上目标路径（`activeFolder || '/'`）。

### FR-5 移动端抽屉
- 宽度 ≤ 768px 时，侧栏变为抽屉，默认隐藏，带遮罩。
- 抽屉开合为**组件内部状态**（`localOpen`），并通过 `update:open` 回传父组件；
  同时支持父组件通过 `v-model:open`（prop `open`）控制。

### FR-6 标签操作（最小可用组合）
- **标签筛选面板**：组件从传入的 `notes` 聚合标签及计数（`aggregateTags`），渲染为可点击 chips。
- 点击标签 → emit `select-tag(tag)`，父组件维护 `activeTags` 并回传用于高亮；再点一次取消（切换语义）。
- 过滤规则与文件夹/搜索一致，由父组件 `useNotes` 统一处理：笔记需同时包含全部激活标签（AND）。
- **给当前笔记加标签**：选中笔记后，底部输入框回车或「添加」→ emit `add-tag(noteId, tag)`，父组件落库（如 `db.put`）。
- **移除当前笔记标签**：选中笔记的标签 chip 上显示「×」→ emit `remove-tag(noteId, tag)`，父组件落库。
- 组件**不**直接修改存储，只 emit 意图（与 FR-3/D 设计一致）。

## 4. 数据接口规格（组件契约）

### Props（父组件 → 组件）
| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `folders` | `Record<string, FolderNode>` | 文件夹树 |
| `notes` | `SidebarNote[]` | 已过滤、已排序的笔记列表 |
| `currentNoteId` | `string?` | 当前选中笔记 _id（高亮） |
| `activeFolder` | `string?` | 当前激活文件夹路径（过滤/高亮） |
| `activeTags` | `string[]?` | 当前激活标签集合（过滤/高亮，父组件拥有） |
| `searchKeywords` | `string?` | 分词后关键词，用于高亮 |
| `open` | `boolean?` | 抽屉开关（v-model:open） |

### Emits（组件 → 父组件）
| 事件 | 载荷 | 说明 |
| --- | --- | --- |
| `select-note` | `string` (noteId) | 选中笔记 |
| `select-folder` | `string` (path) | 选中文件夹 |
| `select-tag` | `string` (tag) | 点标签筛选 |
| `add-tag` | `string` (noteId), `string` (tag) | 给当前笔记加标签 |
| `remove-tag` | `string` (noteId), `string` (tag) | 移除当前笔记标签 |
| `create-note` | `string` (targetPath) | 新建笔记 |
| `search` | `string` (rawQuery) | 搜索原始输入 |
| `clear-search` | `void` | 清除搜索 |
| `update:open` | `boolean` | 抽屉状态同步 |

### 类型定义（精简）
```ts
interface SidebarNote { _id: string; title: string; path: string; content: string; updatedAt?: string; tags?: string[] }
interface FolderNode { name: string; path: string; count: number; children: Record<string, FolderNode> }
```

## 5. 非功能需求

- NFR-1：组件仅 `vue` 为 peerDependency，不捆绑 PouchDB。
- NFR-2：提供 `.d.ts` 类型声明，开箱即用 TypeScript。
- NFR-3：发布到 npm（包名 `@richard432/vue-note-sidebar`），并通过 GitHub Actions 在打 tag / 发 Release 时自动发布。
- NFR-4：核心纯函数（`buildFolderTree` / `filterNotes` / `sortNotes` / `aggregateTags`）覆盖单元测试。

## 6. 验收标准

- `npm run build` 产出 `dist/`（含 `index.d.ts`）。
- `npm test` 全部通过。
- demo（`npm run dev`）中：列表/树/搜索高亮/抽屉均按上述行为工作。
- 推送 `v*` tag 后 Actions 自动执行 `npm publish`。
