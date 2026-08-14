/** 连通性测试结果（PRD US-06）：最佳努力预检，不阻断切换 */
export type ConnectivityStatus = 'ok' | 'invalid-key' | 'unreachable' | 'unsupported'

export interface ConnectivityResult {
  status: ConnectivityStatus
  /** 探测成功的往返耗时 */
  latencyMs?: number
  message: string
}
