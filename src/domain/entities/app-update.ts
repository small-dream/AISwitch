/** 已通过 updater 签名校验、可供 UI 展示的应用更新信息。 */
export interface AppUpdate {
  currentVersion: string
  version: string
  date?: string
  body?: string
}
