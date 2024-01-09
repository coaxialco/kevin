import type { Terminal } from 'terminal-kit';
import { realTerminal as terminal } from 'terminal-kit';
import { getOpenAIKey } from './lib/api-key';
import { ChatRunner } from './lib/chat-runner';
import multiLineInputGenerator from './lib/multi-line-input';

async function main() {
  const apiKey = await getOpenAIKey();
  const chatRunner = new ChatRunner({ apiKey });
  chatRunner.on('content', (content: string) => terminal.yellow(content));
  terminal.yellow('How can I help you?\n');
  terminal.gray('Press CTRL-D to complete your message.\n\n');
  for await (const input of multiLineInputGenerator()) {
    const spinner = await terminal.spinner();
    terminal.nextLine(1);
    terminal.hideCursor(true);
    chatRunner.response.then(() => {
      spinner.animate(false);
      terminal.previousLine(1);
      terminal.delete(1);
      terminal.nextLine(1);
    });
    await chatRunner.sendMessage(input);
    terminal.hideCursor(false);
  }
}

main();
