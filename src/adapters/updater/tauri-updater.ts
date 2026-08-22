import { relaunch } from '@tauri-apps/plugin-process'
import { check, type Update } from '@tauri-apps/plugin-updater'

import { AppError, toAppError } from '@/domain/errors'
import type { AppUpdate } from '@/domain/entities/app-update'
import type { UpdatePort } from '@/types/update-port'

function toAppUpdate(update: Update): AppUpdate {
  return {
    currentVersion: update.currentVersion,
    version: update.version,
    date: update.date,
    body: update.body,
  }
}

function requirePendingUpdate(
  update: Update | null,
  code: 'E_UPDATE_DOWNLOAD' | 'E_UPDATE_INSTALL'
) {
  if (update) {
    return update
  }
  const message = code === 'E_UPDATE_DOWNLOAD' ? '没有可下载的更新' : '没有可安装的更新'
  throw new AppError(code, message)
}

/** Tauri updater 适配器：保留下载句柄，确保 install 只使用已下载内容。 */
export function createTauriUpdater(): UpdatePort {
  let pendingUpdate: Update | null = null
  return {
    async check() {
      try {
        pendingUpdate = await check()
        return pendingUpdate ? toAppUpdate(pendingUpdate) : null
      } catch (error) {
        pendingUpdate = null
        throw toAppError(error, 'E_UPDATE_CHECK', '检查更新失败')
      }
    },
    async download() {
      try {
        await requirePendingUpdate(pendingUpdate, 'E_UPDATE_DOWNLOAD').download()
      } catch (error) {
        throw toAppError(error, 'E_UPDATE_DOWNLOAD', '下载更新失败')
      }
    },
    async install() {
      try {
        await requirePendingUpdate(pendingUpdate, 'E_UPDATE_INSTALL').install()
        await relaunch()
      } catch (error) {
        throw toAppError(error, 'E_UPDATE_INSTALL', '安装更新失败')
      }
    },
  }
}

/** 仅桌面运行时允许调用 Tauri updater；Web 预览保持可用。 */
export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
