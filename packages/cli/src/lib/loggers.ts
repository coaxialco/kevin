import { realTerminal as terminal } from 'terminal-kit';

const { NODE_ENV } = process.env;

export function toolLogger(s: string) {
  if (NODE_ENV === 'test') {
    console.log(s);
  } else {
    terminal.cyan(s);
  }
}
