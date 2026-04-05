import { z } from 'zod'

/**
 * Cache file that stores previously uploaded local photos and their public
 * Google Drive URLs.
 */
export let photoUploadCacheSchema = z
  .object({
    entries: z
      .record(
        z.string(),
        z
          .object({
            publicUrl: z.string().trim().min(1),
            fileId: z.string().trim().min(1),
            hash: z.string().trim().min(1),
          })
          .strict(),
      )
      .default({})
      .describe(
        'Mapping of absolute local photo paths to their last uploaded Drive file metadata',
      ),
    version: z.literal(1).describe('Version of the photo upload cache format'),
  })
  .strict()
  .describe(
    'Cache file that stores previously uploaded local photos and their public Google Drive URLs',
  )

export type PhotoUploadCacheSchema = z.infer<typeof photoUploadCacheSchema>
