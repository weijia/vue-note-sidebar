import { describe, it, expect } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import NoteSidebar from './NoteSidebar.vue'
import type { SidebarNote, FolderNode } from '../types'

const folders: Record<string, FolderNode> = {
  工作: { name: '工作', path: '/工作', count: 1, children: {} },
}

const notes: SidebarNote[] = [
  { _id: '1', title: '需求文档', path: '/工作', content: '登录', updatedAt: '2026-01-01T00:00:00Z' },
]

describe('NoteSidebar (SSR smoke)', () => {
  it('renders notes and folders without throwing', async () => {
    const app = createSSRApp(NoteSidebar, {
      folders,
      notes,
      currentNoteId: '1',
      searchKeywords: '',
      activeFolder: '',
      open: false,
    })
    const html = await renderToString(app)
    expect(html).toContain('需求文档')
    expect(html).toContain('工作')
  })
})
