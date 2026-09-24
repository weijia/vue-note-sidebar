import { describe, it, expect } from 'vitest'
import {
  buildFolderTree,
  filterNotes,
  sortNotes,
  matchKeywords,
} from './useNotes'
import type { SidebarNote } from '../types'

const notes: SidebarNote[] = [
  { _id: '1', title: '需求文档', path: '/工作/项目A', content: '登录功能', updatedAt: '2026-01-01T00:00:00Z' },
  { _id: '2', title: '设计稿', path: '/工作/项目A', content: 'Figma', updatedAt: '2026-03-01T00:00:00Z' },
  { _id: '3', title: '日记', path: '/个人', content: '今天天气好', updatedAt: '2026-02-01T00:00:00Z' },
  { _id: '4', title: '子任务', path: '/工作/项目A/子模块', content: 'x', updatedAt: '2026-04-01T00:00:00Z' },
]

describe('buildFolderTree', () => {
  it('构建嵌套文件夹树并正确计数（含子目录）', () => {
    const tree = buildFolderTree(notes)
    expect(tree['工作'].count).toBe(3) // note1 + note2 + note4(落入子模块)
    expect(tree['工作'].children['项目A'].count).toBe(3) // note1 + note2 + note4
    expect(tree['个人'].count).toBe(1)
    expect(tree['工作'].children['项目A'].children['子模块'].count).toBe(1)
  })
})

describe('filterNotes', () => {
  it('按文件夹前缀过滤', () => {
    const r = filterNotes(notes, { activeFolder: '/工作/项目A' })
    expect(r.map((n) => n._id).sort()).toEqual(['1', '2', '4'])
  })

  it('按关键词 AND 匹配标题与内容', () => {
    const r = filterNotes(notes, { keywords: '需求 登录' })
    expect(r.map((n) => n._id)).toEqual(['1'])
  })
})

describe('matchKeywords', () => {
  it('空查询命中全部', () => {
    expect(matchKeywords(notes[0], '   ')).toBe(true)
  })
})

describe('sortNotes', () => {
  it('默认按 updatedAt 倒序', () => {
    const r = sortNotes(notes)
    expect(r[0]._id).toBe('4')
    expect(r[r.length - 1]._id).toBe('1')
  })
})
