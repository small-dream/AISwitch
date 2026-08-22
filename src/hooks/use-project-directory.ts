import { useState } from 'react'

import { projectDirectoryService } from '@/app/composition'
import type { PickedProjectDirectory } from '@/adapters/system/directory-picker'
import { toAppError } from '@/domain/errors'

export function useProjectDirectory() {
  const [directory, setDirectory] = useState<PickedProjectDirectory | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isPicking, setIsPicking] = useState(false)

  const choose = async (): Promise<PickedProjectDirectory | null> => {
    setIsPicking(true)
    setError(null)
    try {
      const picked = await projectDirectoryService.pick()
      if (picked) {
        setDirectory(picked)
      }
      return picked
    } catch (reason) {
      setError(toAppError(reason, 'E_VALIDATION_FAILED', '选择项目目录失败'))
      return null
    } finally {
      setIsPicking(false)
    }
  }

  const clear = (): void => {
    setDirectory(null)
    setError(null)
  }

  return { directory, error, isPicking, choose, clear }
}
