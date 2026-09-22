import { z } from "zod";

export const companyBriefSchema = z.object({
  summary: z.string().min(1),
  what_they_do: z.string().min(1),
  sources: z.array(z.string().url()),
});

export type CompanyBrief = z.infer<typeof companyBriefSchema>;