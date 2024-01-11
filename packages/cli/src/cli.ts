import { realTerminal as terminal } from 'terminal-kit';
import { getOpenAIKey } from './lib/api-key';
import multiLineInputGenerator from './lib/multi-line-input';
import ClarifierRunner from './runners/clarifier';

function logContent(content: string) {
  terminal.yellow(content);
}

async function main() {
  const apiKey = await getOpenAIKey();
  let runner = new ClarifierRunner({ apiKey });
  runner.addListener('content', logContent);
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
    runner.on('handoff', (newRunner) => {
      if (!newRunner.listeners('content').includes(logContent)) {
        newRunner.addListener('content', logContent);
      }
      runner = newRunner;
    });
    await runner.sendMessage(input);
    terminal.hideCursor(false);
  }
}

main();
