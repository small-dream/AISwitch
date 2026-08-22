import type { z } from 'zod'
import type {
  bundleCollectionSchema,
  bundleInputSchema,
  bundleSchema,
} from '@/domain/schemas/bundle'

export type Bundle = z.infer<typeof bundleSchema>
export type BundleInput = z.infer<typeof bundleInputSchema>
export type BundleCollection = z.infer<typeof bundleCollectionSchema>
