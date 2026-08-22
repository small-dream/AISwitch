import type { z } from 'zod'

import type {
  projectConfigRecordCollectionSchema,
  projectConfigRecordSchema,
} from '@/domain/schemas/project-config-record'

export type ProjectConfigRecord = z.infer<typeof projectConfigRecordSchema>
export type ProjectConfigRecordCollection = z.infer<typeof projectConfigRecordCollectionSchema>
