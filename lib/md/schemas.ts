import { z } from "zod";

const SingleChoiceSchema = z.object({
  type: z.literal("single_choice"),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(10),
});

const MultipleChoiceSchema = z.object({
  type: z.literal("multiple_choice"),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(10),
});

const WordCloudSchema = z.object({
  type: z.literal("word_cloud"),
  question: z.string().min(1),
  max_words: z.number().int().min(1).max(5).default(3),
});

const OpenEndedSchema = z.object({
  type: z.literal("open_ended"),
  question: z.string().min(1),
});

const ScaleSchema = z
  .object({
    type: z.literal("scale"),
    question: z.string().min(1),
    min: z.number().int().min(-100).max(100),
    max: z.number().int().min(-100).max(100),
    labels: z.array(z.string()).length(2).optional(),
  })
  .refine((d) => d.max > d.min, { message: "max must be greater than min" });

export const QuestionSchema = z.discriminatedUnion("type", [
  SingleChoiceSchema,
  MultipleChoiceSchema,
  WordCloudSchema,
  OpenEndedSchema,
  ScaleSchema,
]);

export type Question = z.infer<typeof QuestionSchema>;
export type SingleChoiceQuestion = z.infer<typeof SingleChoiceSchema>;
export type MultipleChoiceQuestion = z.infer<typeof MultipleChoiceSchema>;
export type WordCloudQuestion = z.infer<typeof WordCloudSchema>;
export type OpenEndedQuestion = z.infer<typeof OpenEndedSchema>;
export type ScaleQuestion = z.infer<typeof ScaleSchema>;

// Vote value shapes
export const VoteValueSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("single_choice"), option_index: z.number().int().min(0) }),
  z.object({ type: z.literal("multiple_choice"), option_indices: z.array(z.number().int().min(0)).min(1) }),
  z.object({ type: z.literal("word_cloud"), words: z.array(z.string().min(1)).min(1).max(5) }),
  z.object({ type: z.literal("open_ended"), text: z.string().min(1).max(2000) }),
  z.object({ type: z.literal("scale"), value: z.number() }),
]);

export type VoteValue = z.infer<typeof VoteValueSchema>;
