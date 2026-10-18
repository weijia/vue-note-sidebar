import { describe, it, expect } from 'vitest'
import {
  buildFolderTree,
  filterNotes,
  sortNotes,
  matchKeywords,
  aggregateTags,
} from './useNotes'
import type { SidebarNote } from '../types'

const notes: SidebarNote[] = [
  { _id: '1', title: '需求文档', path: '/工作/项目A', content: '登录功能', tags: ['重要'], updatedAt: '2026-01-01T00:00:00Z' },
  { _id: '2', title: '设计稿', path: '/工作/项目A', content: 'Figma', tags: ['进行中'], updatedAt: '2026-03-01T00:00:00Z' },
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

  it('matchPath 透传：默认不按目录搜，true 时才搜', () => {
    // notes 中 _id 是纯数字，path 含 '项目A'；默认关键词 '项目A' 不应命中任何笔记
    expect(filterNotes(notes, { keywords: '项目A' })).toEqual([])
    // 开启 matchPath 后，按目录名搜到 path 含 '项目A' 的 3 条
    const r = filterNotes(notes, { keywords: '项目A', matchPath: true })
    expect(r.map((n) => n._id).sort()).toEqual(['1', '2', '4'])
  })
})

describe('matchKeywords', () => {
  it('空查询命中全部', () => {
    expect(matchKeywords(notes[0], '   ')).toBe(true)
  })

  // 构造一条 _id 含目录的笔记，模拟真实 Gitee 数据（_id = 相对路径）
  const pathNote: SidebarNote = {
    _id: '/life/咖啡馆/手冲笔记.md',
    title: '随笔',
    path: '/life/咖啡馆',
    content: '今天喝了瑰夏',
    updatedAt: '2026-06-01T00:00:00Z',
  }

  it('默认不在目录名中搜索', () => {
    // '咖啡馆' 只出现在 path（目录），默认不应命中
    expect(matchKeywords(pathNote, '咖啡馆')).toBe(false)
    expect(matchKeywords(pathNote, 'life')).toBe(false)
  })

  it('matchPath=true 时才在目录名中搜索', () => {
    expect(matchKeywords(pathNote, '咖啡馆', true)).toBe(true)
    expect(matchKeywords(pathNote, 'life', true)).toBe(true)
  })

  it('可以按文件名搜索，且忽略 .md 后缀', () => {
    expect(matchKeywords(pathNote, '手冲笔记')).toBe(true)
    expect(matchKeywords(pathNote, '手冲笔记.md')).toBe(true)
  })

  it('标题/内容/标签始终可搜（与 matchPath 无关）', () => {
    expect(matchKeywords(pathNote, '瑰夏')).toBe(true)
    expect(matchKeywords(pathNote, '随笔')).toBe(true)
  })
})

describe('sortNotes', () => {
  it('默认按 updatedAt 倒序', () => {
    const r = sortNotes(notes)
    expect(r[0]._id).toBe('4')
    expect(r[r.length - 1]._id).toBe('1')
  })
})

describe('filterNotes - 标签过滤', () => {
  it('按单个激活标签 AND 匹配', () => {
    const r = filterNotes(notes, { activeTags: ['重要'] })
    expect(r.map((n) => n._id)).toEqual(['1'])
  })

  it('按多个激活标签需全部命中', () => {
    const tagged = [
      ...notes,
      { _id: '6', title: 'x', path: '/', content: '', tags: ['重要', '进行中'], updatedAt: '2026-05-01T00:00:00Z' },
    ]
    const r = filterNotes(tagged, { activeTags: ['重要', '进行中'] })
    expect(r.map((n) => n._id)).toEqual(['6'])
  })
})

describe('aggregateTags', () => {
  it('按出现次数降序聚合标签并计数', () => {
    const tagged = [
      ...notes,
      { _id: '6', title: 'x', path: '/', content: '', tags: ['重要', '进行中'], updatedAt: '2026-05-01T00:00:00Z' },
    ]
    const r = aggregateTags(tagged)
    const important = r.find((t) => t.name === '重要')!
    expect(important.count).toBe(2) // note1 + note6
    expect(r[0].count).toBeGreaterThanOrEqual(r[r.length - 1].count)
  })
})
