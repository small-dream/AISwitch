import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { t, translate, useT } from '@/i18n/index'
import { useLocaleStore } from '@/i18n/locale-store'
import { en } from '@/i18n/en'
import { zhCN } from '@/i18n/zh-CN'

describe('i18n', () => {
  beforeEach(() => {
    useLocaleStore.getState().setLocale('zh-CN')
  })

  it('按语言返回词条', () => {
    expect(translate('zh-CN', 'common.cancel')).toBe('取消')
    expect(translate('en', 'common.cancel')).toBe('Cancel')
  })

  it('插值占位符；缺参保留占位符', () => {
    expect(translate('en', 'presetRow.switchedTo', { name: 'GLM-4.6' })).toBe('Switched to GLM-4.6')
    expect(translate('en', 'presetRow.switchedTo')).toBe('Switched to {name}')
  })

  it('t() 跟随当前语言', () => {
    expect(t('common.save')).toBe('保存')
    act(() => {
      useLocaleStore.getState().setLocale('en')
    })
    expect(t('common.save')).toBe('Save')
  })

  it('useT() 在语言切换后返回新翻译', () => {
    const initial = renderHook(() => useT())
    expect(initial.result.current('common.save')).toBe('保存')
    act(() => {
      useLocaleStore.getState().toggleLocale()
    })
    expect(initial.result.current('common.save')).toBe('Save')
  })

  it('英文词典与中文词典逐 key 对齐', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zhCN).sort())
  })
})
