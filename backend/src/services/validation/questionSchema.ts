import { z } from "zod";

export const questionCategorySchema = z.enum(["technical", "behavioural", "system-design", "company-fit"]);

export const questionSchema = z.object({
  id: z.string().min(1),
  requirement_ids: z.array(z.string().min(1)).min(1),
  category: questionCategorySchema,
  prompt: z.string().min(1),
  answer_outline: z.string().min(1),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export const questionsGenerationSchema = z.object({
  questions: z.array(questionSchema),
});

export type Question = z.infer<typeof questionSchema>;
export type QuestionCategory = z.infer<typeof questionCategorySchema>;