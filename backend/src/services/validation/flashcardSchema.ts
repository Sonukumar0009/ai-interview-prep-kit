import { z } from "zod";

export const flashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(z.string().min(1)).min(1),
});

export const flashcardsGenerationSchema = z.object({
  flashcards: z.array(flashcardSchema),
});

export type Flashcard = z.infer<typeof flashcardSchema>;