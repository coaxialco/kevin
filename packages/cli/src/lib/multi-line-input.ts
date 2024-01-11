import readline from 'node:readline';
import { realTerminal as terminal } from 'terminal-kit';
export default async function* multiLineInputGenerator(): AsyncGenerator<string, void, unknown> {
  const inputLines: string[] = [];
  let currentLine = '';
  let enterPressCount = 0;
  let lastEnterPressTime = 0;
  let resolveKeyPress: (() => void) | null = null;
  let active = true;
  if (!process.stdin.isTTY) {
    const startLine = '\n\n\n******************** START OF STDIN *******************\n\n\n';
    const endLine = '\n\n\n********************* END OF STDIN ********************\n\n\n';

    terminal.cyan(startLine);
    inputLines.push(startLine);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    for await (const line of rl) {
      terminal.cyan(`${line}\n`);
      inputLines.push(line);
    }

    terminal.cyan(endLine);
    inputLines.push(endLine);
  }

  function handleKey(name: string) {
    if (name === 'CTRL_C') {
      terminal.green('\nExiting...\n');
      process.exit();
    }

    if (!active) {
      return;
    }

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
    // Handle CTRL+D for exit
    else if (name === 'CTRL_D') {
      inputLines.push(currentLine);
      currentLine = '';
      terminal('\n');
      enterPressCount = 0;
      if (resolveKeyPress) {
        resolveKeyPress();
      }
    }
    // Accumulate other characters
    else {
      currentLine += name;
      terminal(name);
    }
  }

  terminal.addListener('key', handleKey);
  terminal.grabInput(true);

  while (true) {
    await new Promise<void>((resolve) => {
      resolveKeyPress = resolve;
    });
    const message = inputLines.join('\n').trim();
    active = false;
    if (message.length > 0) {
      yield message;
    }
    active = true;
    inputLines.length = 0;
    currentLine = '';
  }
}
