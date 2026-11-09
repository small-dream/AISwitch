/**
 * 进程内串行队列：把「读-改-写」串成一列，避免并发写互相覆盖。
 * 例：同一时刻对两个工具首次捕获基线，各自读到旧 manifest 后整体回写，
 * 后写者会抹掉先写者的条目。任务之间互不传染失败（前序失败不影响后续），
 * 但单次任务的错误会原样抛给调用方。
 */
export function createSerialQueue(): <T>(task: () => Promise<T>) => Promise<T> {
  let chain: Promise<unknown> = Promise.resolve()
  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = chain.then(task, task)
    chain = run.then(
      () => undefined,
      () => undefined
    )
    return run
  }
}
