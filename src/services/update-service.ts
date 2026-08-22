import type { AppUpdate } from '@/domain/entities/app-update'
import type { UpdatePort } from '@/types/update-port'

type RuntimeAvailability = () => boolean

/** 更新用例：检查后立即预下载，安装动作由用户明确触发。 */
export class UpdateService {
  constructor(
    private readonly updater: UpdatePort,
    private readonly isAvailable: RuntimeAvailability = () => true
  ) {}

  canCheck(): boolean {
    return this.isAvailable()
  }

  async prepare(): Promise<AppUpdate | null> {
    const update = await this.updater.check()
    if (!update) {
      return null
    }
    await this.updater.download()
    return update
  }

  install(): Promise<void> {
    return this.updater.install()
  }
}
