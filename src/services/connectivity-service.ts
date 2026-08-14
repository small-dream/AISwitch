import type { ConnectivityProber } from '@/adapters/connectivity/http-prober'
import type { ConnectivityResult } from '@/domain/entities/connectivity'
import type { Preset } from '@/domain/entities/preset'

/** 连通性测试用例（PRD US-06）：最佳努力预检，不阻断切换 */
export class ConnectivityService {
  constructor(private readonly prober: ConnectivityProber) {}

  test(preset: Preset): Promise<ConnectivityResult> {
    return this.prober.probe(preset)
  }
}
