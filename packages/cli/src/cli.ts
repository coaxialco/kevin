import type { Terminal } from 'terminal-kit';
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
  let spinnerPromise: Promise<Terminal.AnimatedText> | void;
  chatRunner.on('waiting', async (waiting: boolean) => {
    if (waiting) {
      if (!spinnerPromise) {
        spinnerPromise = terminal.spinner();
      }
      return;
    }
    if (!spinnerPromise) {
      return;
    }
    const spinner = await spinnerPromise;
    spinner.animate(false);
  });

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
    terminal.gray('\n\n===============================\n\n');
  }
}

main();
