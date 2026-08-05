import { createLlmChatConfigFromEnv, type LlmChatConfig } from '@sf/shared-types';
import { ChatOpenAI } from '@langchain/openai';

function resolveChatConfig(config?: LlmChatConfig): LlmChatConfig {
  return config ?? createLlmChatConfigFromEnv();
}

export function createTogetherChatModel(temperature = 0.4, config?: LlmChatConfig): ChatOpenAI {
  const chatConfig = resolveChatConfig(config);

  return new ChatOpenAI({
    apiKey: chatConfig.apiKey,
    model: chatConfig.model,
    temperature,
    streaming: true,
    configuration: {
      baseURL: chatConfig.baseUrl,
    },
  });
}
