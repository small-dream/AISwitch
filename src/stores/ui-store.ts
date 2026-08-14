import { create } from 'zustand'
import type { TargetTool } from '@/domain/entities/preset'

interface UIState {
  /** 当前操作页签：Claude Code / Codex */
  activeTool: TargetTool
  setActiveTool: (tool: TargetTool) => void
}

export const useUIStore = create<UIState>()((set) => ({
  activeTool: 'claude-code',
  setActiveTool: (tool) => {
    set({ activeTool: tool })
  },
}))
