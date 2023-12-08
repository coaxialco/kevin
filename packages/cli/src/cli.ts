import { realTerminal as terminal } from 'terminal-kit';
import { getOpenAIKey } from './lib/api-key';
import multiLineInputGenerator from './lib/multi-line-input';
import { ChatRunner } from './lib/runner';

let _chatRunner: ChatRunner | void;

async function getChatRunner() {
  if (typeof _chatRunner !== 'undefined') {
    return _chatRunner;
  }
  const key = await getOpenAIKey();
  const chatRunner = new ChatRunner(key);
  chatRunner.on('content', (content: string) => terminal.yellow(content));
  _chatRunner = chatRunner;
  return chatRunner;
}

async function main() {
  terminal.yellow('How can I help you?\n');
  terminal.gray('Press ENTER three times quickly to complete your message.\n\n');
  const chatRunnerPromise = getChatRunner();
  for await (const input of multiLineInputGenerator()) {
    const chatRunner = await chatRunnerPromise;
    await chatRunner.sendMessage(input);
  }
}

main();
