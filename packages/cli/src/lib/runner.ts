import EventEmitter from 'events';
import { default as OpenAI } from 'openai';
import { currentWorkingDirectory as cwd } from './current-working-directory';
import currentWorkingDirectory from '../tools/current-working-directory';
import readDirectory from '../tools/read-directory';
import readFile from '../tools/read-file';
import applyPatch from '../tools/apply-patch';
import resolveModule from '../tools/resolve-module';
import writeFile from '../tools/write-file';

export class ChatRunner extends EventEmitter {
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are a world-class software developer assisting your company's CTO.
        Use the provided functions to perform the tasks the CTO requests.
        When asked to write software, save the code to the filesystem using the provided functions.
        Always read the associated files and imported modules before answering.
        Do not output code to the console if it is being written to the filesystem.
        If a file already exists read the file with line numbers and apply a patch instead of overwriting the file.
        The current working directory is: ${cwd()}
        You can read or write files in the current working directory.
        The current date is: ${new Date().toUTCString()}`
    }
  ];

  openai: OpenAI;

  constructor(apiKey: string) {
    super();
    this.openai = new OpenAI({ apiKey });
  }

  sendMessage(message: string) {
    this.messages.push({ role: 'user', content: message });
    const runner = this.openai.beta.chat.completions.runTools({
      model: 'gpt-4-1106-preview',
      stream: true,
      tools: [readFile, writeFile, readDirectory, currentWorkingDirectory, resolveModule, applyPatch],
      messages: this.messages
    });
    runner.on('message', (message: OpenAI.Chat.Completions.ChatCompletionMessageParam) => {
      this.messages.push(message);
      this.emit('content', '\n\n');
    });
    runner.on('content', (content: string) => {
      this.emit('content', content);
    });
    return runner.finalChatCompletion();
  }
}
