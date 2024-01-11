import { realTerminal } from 'terminal-kit';

const { NODE_ENV } = process.env;

const methodsToIntercept = [
  'defaultColor',
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'brightBlack',
  'gray',
  'grey',
  'brightRed',
  'brightGreen',
  'brightYellow',
  'brightBlue',
  'brightMagenta',
  'brightCyan',
  'brightWhite',
  'color',
  'darkColor',
  'brightColor',
  'color256',
  'colorRgb',
  'colorRgbHex',
  'colorGrayscale',
  'bgDefaultColor',
  'bgBlack',
  'bgRed',
  'bgGreen',
  'bgYellow',
  'bgBlue',
  'bgMagenta',
  'bgCyan',
  'bgWhite',
  'bgDarkColor',
  'bgBrightBlack',
  'bgGray',
  'bgGrey',
  'bgBrightRed',
  'bgBrightGreen',
  'bgBrightYellow',
  'bgBrightBlue',
  'bgBrightMagenta',
  'bgBrightCyan',
  'bgColor',
  'bgBrightWhite',
  'bgBrightColor',
  'bgColor256',
  'bgColorRgb',
  'bgColorRgbHex',
  'bgColorGrayscale',
  'bold',
  'dim',
  'italic',
  'underline',
  'blink',
  'inverse',
  'hidden',
  'strike'
];

function createTerminalProxy(terminal: any): any {
  return new Proxy(terminal, {
    get(target, prop, receiver) {
      if (NODE_ENV === 'test' && methodsToIntercept.includes(prop as string)) {
        return (...args: any[]) => {
          console.log(...args);
          return target;
        };
      }
      return Reflect.get(target, prop, receiver);
    },
    apply(target, thisArg, args) {
      if (NODE_ENV === 'test') {
        console.log(...args);
        return target;
      }
      return Reflect.apply(target, thisArg, args);
    }
  });
}

export const terminal = createTerminalProxy(realTerminal);

export function toolLogger(s: string) {
  terminal.cyan(s);
}
