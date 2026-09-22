import { z } from "zod";

export const requirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  kind: z.enum(["technical", "behavioural", "domain"]),
  priority: z.enum(["must", "nice"]),
});

export const requirementsExtractionSchema = z.object({
  role_title: z.string(),
  seniority: z.string(),
  location: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(requirementSchema),
});

export type Requirement = z.infer<typeof requirementSchema>;
export type RequirementsExtraction = z.infer<typeof requirementsExtractionSchema>;