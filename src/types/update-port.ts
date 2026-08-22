import type { AppUpdate } from '@/domain/entities/app-update'

/** 更新端口：业务层不依赖 Tauri updater 的具体对象。 */
export interface UpdatePort {
  check(): Promise<AppUpdate | null>
  download(): Promise<void>
  install(): Promise<void>
}
