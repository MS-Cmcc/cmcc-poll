import { readFileSync } from "fs";
import { join } from "path";
import { parseQuestionsMarkdown } from "../lib/md/parser";

const filePath = join(process.cwd(), "questions.md");

let content: string;
try {
  content = readFileSync(filePath, "utf-8");
} catch {
  console.error("Error: questions.md not found at repo root");
  process.exit(1);
}

const { questions, errors } = parseQuestionsMarkdown(content);

if (errors.length > 0) {
  console.error(`\nFound ${errors.length} error(s) in questions.md:\n`);
  errors.forEach((e) => console.error(`  ✗ ${e}`));
  process.exit(1);
}

console.log(`\n✓ questions.md is valid — ${questions.length} question(s) parsed:\n`);
questions.forEach((q, i) => {
  console.log(`  ${i + 1}. [${q.type}] ${q.question}`);
});
console.log();
