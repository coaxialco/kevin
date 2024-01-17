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
  //for await (const input of multiLineInputGenerator()) {
  //  terminal.yellow('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n');
  //  terminal(JSON.stringify(input));
  //  terminal.yellow('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n');
  //}
  for await (const input of multiLineInputGenerator()) {
    terminal.hideCursor();
    terminal.yellow('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n');
    runner.response.then(() => {
      terminal('\n');
    });
    runner.on('handoff', (newRunner) => {
      if (!newRunner.listeners('content').includes(logContent)) {
        newRunner.addListener('content', logContent);
      }
      runner = newRunner;
    });
    await runner.sendMessage(input);
    terminal.yellow('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n');
    terminal.hideCursor(false);
  }
}

main();
