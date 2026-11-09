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

/**
 * Tauri updater 适配器：保留下载句柄，确保 install 只使用已下载内容。
 * `download` 按版本幂等——后台重取（网络恢复、窗口聚焦重查）会重复走
 * check → download，同一版本不得二次下载；安装前再校验一次「确已下载」，
 * 否则会拿一个已被置空的句柄去 install。
 */
export function createTauriUpdater(): UpdatePort {
  let pendingUpdate: Update | null = null
  let downloadedVersion: string | null = null

  return {
    async check() {
      try {
        const next = await check()
        if (next?.version !== pendingUpdate?.version) {
          downloadedVersion = null
        }
        pendingUpdate = next
        return next ? toAppUpdate(next) : null
      } catch (error) {
        pendingUpdate = null
        downloadedVersion = null
        throw toAppError(error, 'E_UPDATE_CHECK', '检查更新失败')
      }
    },

    async download() {
      try {
        const update = requirePendingUpdate(pendingUpdate, 'E_UPDATE_DOWNLOAD')
        if (downloadedVersion === update.version) {
          return
        }
        await update.download()
        downloadedVersion = update.version
      } catch (error) {
        throw toAppError(error, 'E_UPDATE_DOWNLOAD', '下载更新失败')
      }
    },

    async install() {
      try {
        const update = requirePendingUpdate(pendingUpdate, 'E_UPDATE_INSTALL')
        if (downloadedVersion !== update.version) {
          throw new AppError('E_UPDATE_INSTALL', '更新尚未下载完成，请重新检查更新')
        }
        await update.install()
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
