import { ChatOpenAI } from '@langchain/openai';

const TOGETHER_BASE_URL = 'https://api.together.ai/v1';
const TOGETHER_MODEL = 'MiniMaxAI/MiniMax-M3';

function getTogetherApiKey(): string {
  const apiKey = process.env['TOGETHER_AI_API_KEY'];
  if (!apiKey) {
    throw new Error('Missing TOGETHER_AI_API_KEY environment variable');
  }
  return apiKey;
}

export function createTogetherChatModel(temperature = 0.4): ChatOpenAI {
  return new ChatOpenAI({
    apiKey: getTogetherApiKey(),
    model: TOGETHER_MODEL,
    temperature,
    streaming: true,
    configuration: {
      baseURL: TOGETHER_BASE_URL,
    },
  });
}
