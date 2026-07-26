export interface GeneratedQuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctAnswer: number;
  explanation: string;
}

export interface GeneratedQuizPayload {
  title: string;
  questions: GeneratedQuizQuestion[];
}

export async function generateQuizFromHtml(
  html: string,
  documentTitle: string,
  questionCount: number,
): Promise<GeneratedQuizPayload> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable');
  }

  const prompt = `You are an expert quiz creator. Read the following HTML document and create exactly ${questionCount} multiple-choice quiz questions.

Document title: ${documentTitle}

Requirements:
- Each question must have exactly 4 answer options
- correctAnswer must be the zero-based index (0-3) of the correct option
- Include a concise explanation for the correct answer
- Return ONLY valid JSON with this shape:
{
  "title": "Quiz title",
  "questions": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}

HTML document:
${html.slice(0, 100_000)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    },
  ).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini returned an empty response');
  }

  const parsed = JSON.parse(text) as GeneratedQuizPayload;

  if (!parsed.title || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error('Gemini returned an invalid quiz payload');
  }

  for (const question of parsed.questions) {
    if (
      !question.question ||
      !Array.isArray(question.options) ||
      question.options.length !== 4 ||
      typeof question.correctAnswer !== 'number' ||
      question.correctAnswer < 0 ||
      question.correctAnswer > 3 ||
      !question.explanation
    ) {
      throw new Error('Gemini returned malformed quiz questions');
    }
  }

  return parsed;
}
