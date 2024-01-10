import { realTerminal as terminal } from 'terminal-kit';
import { getOpenAIKey } from './lib/api-key';
import multiLineInputGenerator from './lib/multi-line-input';
import CtoRunner from './runners/cto';

async function main() {
  const apiKey = await getOpenAIKey();
  const runner = new CtoRunner({ apiKey });
  runner.on('content', (content: string) => terminal.yellow(content));
  terminal.yellow('How can I help you?\n');
  terminal.gray('Press CTRL-D to complete your message.\n\n');
  for await (const input of multiLineInputGenerator()) {
    const spinner = await terminal.spinner();
    terminal.nextLine(1);
    terminal.hideCursor(true);
    runner.response.then(() => {
      spinner.animate(false);
      terminal.previousLine(1);
      terminal.delete(1);
      terminal.nextLine(1);
    });
    await runner.sendMessage(input);
    terminal.hideCursor(false);
  }
}

main();
