export {
  countWords,
  createDocumentSchema,
  createRuleSchema,
  deleteRuleSchema,
  formatValidationError,
  generateQuizSchema,
  parseRequest,
  quizQuestionSchema,
  quizResponseSchema,
  updateRuleSchema,
  type CreateDocumentInput,
  type CreateDocumentRequest,
  type CreateRuleInput,
  type CreateRuleRequest,
  type DeleteRuleRequest,
  type GenerateQuizInput,
  type GenerateQuizRequest,
  type QuizResponsePayload,
  type UpdateRuleInput,
  type UpdateRuleRequest,
} from '@sf/shared-types';

export function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').join('<br />');
      return `<p>${lines}</p>`;
    })
    .join('\n');

  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n<title>Document</title>\n</head>\n<body>\n${paragraphs}\n</body>\n</html>`;
}
