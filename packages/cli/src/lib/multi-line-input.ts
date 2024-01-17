import readline from 'node:readline';
import { realTerminal as terminal } from 'terminal-kit';

class MultiLine {
  lines: string[] = [''];
  xIndex = 0;
  yIndex = 0;
  push(line = '') {
    this.lines.push(line);
    this.yIndex += 1;
    this.xIndex = 0;
    terminal(`${line}\n`);
  }
  newLine(): void {
    const start = this.lines[this.yIndex].slice(0, this.xIndex);
    const end = this.lines[this.yIndex].slice(this.xIndex);
    this.lines[this.yIndex] = start;
    this.lines.splice(this.yIndex + 1, 0, end);
    terminal.eraseLineAfter();
    terminal(`\n`);
    terminal.insertLine(1);
    terminal.column(0);
    terminal(end);
    terminal.column(0);
    terminal.up(1);
    terminal.scrollUp(1);
    this.yIndex += 1;
    this.xIndex = 0;
  }
  insert(s: string): void {
    if (this.yIndex >= this.lines.length) {
      this.lines.push('');
      this.insert(s);
      return;
    }
    const start = this.lines[this.yIndex].slice(0, this.xIndex);
    const end = this.lines[this.yIndex].slice(this.xIndex);
    this.lines[this.yIndex] = start + s + end;
    this.xIndex += s.length;
    terminal.insert(s.length);
    terminal(s);
  }
  left(): void {
    if (this.xIndex === 0) {
      return;
    }
    this.xIndex -= 1;
    terminal.left(1);
  }
  right(): void {
    if (this.xIndex === this.lines[this.yIndex].length) {
      return;
    }
    this.xIndex += 1;
    terminal.right(1);
  }
  up(): void {
    if (this.yIndex === 0) {
      return;
    }
    this.yIndex -= 1;
    terminal.up(1);
    if (this.xIndex > this.lines[this.yIndex].length) {
      this.xIndex = this.lines[this.yIndex].length;
      terminal.column(0);
      terminal.right(this.lines[this.yIndex].length);
    }
  }
  down(): void {
    if (this.yIndex >= this.lines.length - 1) {
      return;
    }
    this.yIndex += 1;
    terminal.down(1);
    if (this.lines[this.yIndex] && this.xIndex > this.lines[this.yIndex].length) {
      this.xIndex = this.lines[this.yIndex].length;
      terminal.column(0);
      terminal.right(this.lines[this.yIndex].length);
    }
  }
  delete(): void {
    if (typeof this.lines[this.yIndex] !== 'string') {
      return;
    }
    if (this.xIndex === this.lines[this.yIndex].length) {
      if (this.lines.length > this.yIndex) {
        const line = this.lines[this.yIndex + 1];
        this.lines.splice(this.yIndex + 1, 1);
        terminal.down(1);
        terminal.deleteLine(1);
        terminal.scrollDown(1);
        terminal(line);
      }
    }
    this.lines[this.yIndex] =
      this.lines[this.yIndex].slice(0, this.xIndex) + this.lines[this.yIndex].slice(this.xIndex + 1);
    terminal.delete(1);
  }
  backspace(): void {
    if (this.xIndex === 0) {
      if (this.lines[this.yIndex].length === 0) {
        this.lines.splice(this.yIndex, 1);
        terminal.deleteLine(1);
        terminal.column(0);
        if (this.yIndex > 0) {
          terminal.up(1);
          this.yIndex -= 1;
          this.xIndex = this.lines[this.yIndex].length;
          terminal.column(0);
          terminal.right(this.lines[this.yIndex].length);
        }
      } else if (this.yIndex > 0) {
        const line = this.lines[this.yIndex];
        this.lines.splice(this.yIndex, 1);
        terminal.deleteLine(1);
        terminal.up(1);
        this.yIndex -= 1;
        this.xIndex = this.lines[this.yIndex].length;
        terminal.column(0);
        terminal.right(this.lines[this.yIndex].length);
        this.insert(line);
      }
      return;
    }
    this.lines[this.yIndex] =
      this.lines[this.yIndex].slice(0, this.xIndex - 1) + this.lines[this.yIndex].slice(this.xIndex);
    this.xIndex -= 1;
    terminal.left(1).delete(1);
  }
  getContentAndClear() {
    const content = this.lines.join('\n').trim();
    terminal.down(this.lines.length - this.yIndex);
    terminal('\n');
    this.lines.length = 0;
    this.xIndex = 0;
    this.yIndex = 0;
    return content;
  }
}

export default async function* multiLineInputGenerator(): AsyncGenerator<string, void, unknown> {
  const lines = new MultiLine();
  let enterPressCount = 0;
  let lastEnterPressTime = 0;
  let resolveKeyPress: (() => void) | null = null;
  let active = true;
  if (!process.stdin.isTTY) {
    const startLine = '\n\n\n******************** START OF STDIN *******************\n\n\n';
    const endLine = '\n\n\n********************* END OF STDIN ********************\n\n\n';

    terminal.cyan(startLine);
    lines.push(startLine);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    for await (const line of rl) {
      terminal.cyan(`${line}\n`);
      lines.push(line);
    }

    terminal.cyan(endLine);
    lines.push(endLine);
  }

  function handleKey(name: string) {
    if (name === 'CTRL_C') {
      terminal.green('\nExiting...\n');
      process.exit();
    }
    if (name !== 'ENTER') {
      enterPressCount = 0;
    }
    if (!active) {
      return;
    }
    if (name.length === 1) {
      lines.insert(name);
    }
    switch (name) {
      case 'ENTER': {
        const now: number = Date.now();

        if (now - lastEnterPressTime > 1000 || now - lastEnterPressTime < 50) {
          enterPressCount = 0;
        }

        enterPressCount++;
        lastEnterPressTime = now;

        if (enterPressCount >= 3) {
          lines.newLine();
          if (resolveKeyPress) {
            resolveKeyPress();
          }
          enterPressCount = 0;
        } else {
          lines.newLine();
        }
        break;
      }
      case 'LEFT':
        lines.left();
        break;
      case 'RIGHT':
        lines.right();
        break;
      case 'UP':
        lines.up();
        break;
      case 'DOWN':
        lines.down();
        break;
      case 'BACKSPACE':
        lines.backspace();
        break;
      case 'DELETE':
        lines.delete();
        break;
      case 'CTRL_D':
        lines.push();
        enterPressCount = 0;
        if (resolveKeyPress) {
          resolveKeyPress();
        }
    }
  }

  terminal.addListener('key', handleKey);
  terminal.grabInput(true);

  while (true) {
    await new Promise<void>((resolve) => {
      resolveKeyPress = resolve;
    });
    //const message = lines.content;
    active = false;
    //if (message.length > 0) {
    //  yield message;
    //}
    yield lines.getContentAndClear();
    active = true;
  }
}
