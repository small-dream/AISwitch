import { describe, expect, it } from 'vitest'

import { createSerialQueue } from '@/utils/serial-queue'

describe('createSerialQueue', () => {
  it('按入队顺序执行，后一个任务能看到前一个的结果', async () => {
    const enqueue = createSerialQueue()
    const order: number[] = []

    const first = enqueue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
      order.push(1)
    })
    const second = enqueue(() => {
      order.push(2)
      return Promise.resolve()
    })
    await Promise.all([first, second])

    expect(order).toEqual([1, 2])
  })

  it('前序失败不阻塞后续任务，但错误仍抛给调用方', async () => {
    const enqueue = createSerialQueue()

    const failing = enqueue(() => Promise.reject(new Error('boom')))
    const next = enqueue(() => Promise.resolve('ok'))

    await expect(failing).rejects.toThrow('boom')
    await expect(next).resolves.toBe('ok')
  })
})
