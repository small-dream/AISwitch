import { pickProjectDirectory, type PickedProjectDirectory } from '@/adapters/system/directory-picker'

/** 项目目录选择服务：隔离系统对话框适配器，供 hook 调用。 */
export class ProjectDirectoryService {
  pick(): Promise<PickedProjectDirectory | null> {
    return pickProjectDirectory()
  }
}
