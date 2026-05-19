import matter from "gray-matter";
import { QuestionSchema, type Question } from "./schemas";

export interface ParseResult {
  questions: Question[];
  errors: string[];
}

export function parseQuestionsMarkdown(content: string): ParseResult {
  const questions: Question[] = [];
  const errors: string[] = [];

  // Split on --- separators, filtering empty blocks
  const blocks = content
    .split(/^---$/m)
    .map((b) => b.trim())
    .filter(Boolean);

  blocks.forEach((block, idx) => {
    const questionNumber = idx + 1;
    try {
      // gray-matter expects content with frontmatter; wrap in --- delimiters
      const parsed = matter(`---\n${block}\n---`);
      const result = QuestionSchema.safeParse(parsed.data);
      if (!result.success) {
        const msgs = result.error.issues
          .map((i) => i.message)
          .join("; ");
        errors.push(`Question ${questionNumber} (${parsed.data.type ?? "unknown"}): ${msgs}`);
      } else {
        questions.push(result.data);
      }
    } catch (e) {
      errors.push(`Question ${questionNumber}: failed to parse YAML — ${(e as Error).message}`);
    }
  });

  return { questions, errors };
}
