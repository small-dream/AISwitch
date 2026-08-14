/**
 * 文件系统端口：依赖倒置的核心接口（ARCHITECTURE §2.3 D3）。
 * 所有路径均为相对 HOME 的正斜杠路径；生产实现走 Tauri fs 插件，测试注入内存替身。
 */
export interface FileSystemPort {
  /** 用户主目录绝对路径（用于写入需要绝对路径的托管配置，如 Codex model_catalog_json） */
  homeDir(): Promise<string>
  exists(path: string): Promise<boolean>
  readTextFile(path: string): Promise<string>
  writeTextFile(path: string, contents: string): Promise<void>
  /** 列出目录下第一层的文件/目录名；目录不存在时返回空数组 */
  readDir(path: string): Promise<string[]>
  /** 递归创建目录（已存在时静默成功） */
  mkdir(path: string): Promise<void>
  remove(path: string): Promise<void>
  rename(from: string, to: string): Promise<void>
}
