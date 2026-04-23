import { z } from 'zod'

export const webhookSchema = z.object({
  requestType: z.string().optional(),
  leadQuality: z.enum(['HOT', 'WARM', 'COLD']).optional().default('WARM'),
  status: z
    .enum(['NEW', 'TO_CALL_BACK', 'IN_PROGRESS', 'CONFIRMED', 'CANCELLED', 'ARCHIVED'])
    .optional()
    .default('NEW'),
  customer: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
  }),
  stay: z
    .object({
      checkIn: z.string().optional(),
      checkOut: z.string().optional(),
      guests: z.number().optional(),
      nights: z.number().optional(),
      roomType: z.string().optional(),
    })
    .optional(),
  notes: z.array(z.string()).optional(),
  operationalSummary: z.string().optional(),
  requiredAction: z.string().optional(),
  durationSeconds: z.number().int().positive().optional(),
})

export type WebhookPayload = z.infer<typeof webhookSchema>
