import readline from 'node:readline';
import { realTerminal as terminal } from 'terminal-kit';

export default async function* multiLineInputGenerator(): AsyncGenerator<string, void, unknown> {
  const inputLines: string[] = [];
  let currentLine = '';
  let enterPressCount = 0;
  let lastEnterPressTime = 0;
  let resolveKeyPress: (() => void) | null = null;

  if (!process.stdin.isTTY) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', (line) => {
      terminal.cyan(`${line}\n`);
      inputLines.push(line);
    });

    await new Promise((resolve) => {
      rl.once('close', resolve);
    });
  }

  terminal.grabInput({});

  terminal.on('key', (name: string) => {
    // Handle Enter key for new line
    if (name === 'ENTER') {
      const now: number = Date.now();

      // Reset count if more than 1 second has passed since the last ENTER press
      if (now - lastEnterPressTime > 1000 || now - lastEnterPressTime < 50) {
        enterPressCount = 0;
      }

      enterPressCount++;
      lastEnterPressTime = now;

      if (enterPressCount >= 3) {
        inputLines.push(currentLine);
        currentLine = '';
        terminal('\n');
        // Yield and clear inputLines
        if (resolveKeyPress) {
          resolveKeyPress();
        }
        enterPressCount = 0;
      } else {
        inputLines.push(currentLine);
        currentLine = '';
        terminal('\n');
      }
    }
    // Handle Backspace key
    else if (name === 'BACKSPACE') {
      currentLine = currentLine.slice(0, -1);
      terminal.left(1).delete(1);
    }
    // Handle CTRL+C for exit
    else if (name === 'CTRL_D') {
      inputLines.push(currentLine);
      currentLine = '';
      terminal('\n');
      enterPressCount = 0;
      if (resolveKeyPress) {
        resolveKeyPress();
      }
    }
    // Handle CTRL+C for exit
    else if (name === 'CTRL_C') {
      terminal.green('\nExiting...\n');
      process.exit();
    }
    // Accumulate other characters
    else {
      currentLine += name;
      terminal(name);
    }
  });

  while (true) {
    await new Promise<void>((resolve) => {
      resolveKeyPress = resolve;
    });
    const message = inputLines.join('\n').trim();
    if (message.length > 0) {
      yield message;
    }
    inputLines.length = 0;
    currentLine = '';
  }
}
