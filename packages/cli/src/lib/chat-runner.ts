import EventEmitter from 'events';
import { default as OpenAI } from 'openai';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { toolLogger } from './loggers';
import wrap from './wrap-tool-function';
import { zodParseJSON } from './zod';
import ctoContent from '../content/cto';
import modifyFile from '../tools/modify-file';
import readDirectory from '../tools/read-directory';
import readFile from '../tools/read-file';
import writeFile from '../tools/write-file';

const params = z.object({
  taskDescription: z.string().describe('A clear and precise description of the task to be performed.')
});

const assignToDeveloperTool = (apiKey: string, parent: ChatRunner) =>
  ({
    type: 'function',
    function: {
      name: 'assignToDeveloper',
      description: 'Assign a task to a developer. Returns a list of messages and tool results from the developer.',
      parameters: zodToJsonSchema(params),
      parse: zodParseJSON(params),
      function: wrap(async function ({ taskDescription }: z.infer<typeof params>) {
        toolLogger(`Assigning to developer:\n\n ${taskDescription.split('\n').join('\n> ')}`);
        const runner = new ChatRunner({ apiKey });
        runner.on('message', parent.handleMessage.bind(parent));
        runner.on('functionCall', parent.handleFunctionCall.bind(parent));
        runner.on('functionCallResult', parent.handleFunctionCall.bind(parent));
        runner.on('content', parent.handleContent.bind(parent));
        const result = await runner.sendMessage(
          `
        
        You have been assigned the following task:

        ${taskDescription}

        Do not assign this to another developer.

          `
            .split('\n')
            .map((line) => line.trim())
            .join('\n')
        );
        return result;
      })
    }
  } as RunnableToolFunction<z.infer<typeof params>>);

export type ChatRunnerOptions = {
  apiKey: string;
};

export class ChatRunner extends EventEmitter {
  systemContent: string = ctoContent;

  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  openai: OpenAI;
  assignToDeveloper: RunnableToolFunction<z.infer<typeof params>>;
  activeFunctionCalls = 0;
  response: Promise<void>;
  responseResolve: void | (() => void) = undefined;

  constructor({ apiKey }: ChatRunnerOptions) {
    super();
    this.openai = new OpenAI({ apiKey });
    this.assignToDeveloper = assignToDeveloperTool(apiKey, this);
    this.response = new Promise<void>((resolve) => {
      this.responseResolve = resolve;
    });
    this.messages.push({
      role: 'system',
      content: this.systemContent
    });
  }

  async sendMessage(message: string) {
    this.messages.push({ role: 'user', content: message });
    const runner = this.openai.beta.chat.completions.runTools({
      //model: 'gpt-4-1106-preview',
      model: 'gpt-3.5-turbo-1106',
      stream: true,
      tools: [readFile, writeFile, readDirectory, modifyFile, this.assignToDeveloper],
      messages: this.messages
    });

    runner.on('message', this.handleMessage.bind(this));
    runner.on('functionCall', this.handleFunctionCall.bind(this));
    runner.on('functionCallResult', this.handleFunctionCall.bind(this));
    runner.on('content', this.handleContent.bind(this));
    const result = await runner.finalChatCompletion();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    return result;
  }

  handleMessage(message: OpenAI.Chat.Completions.ChatCompletionMessageParam) {
    this.messages.push(message);
    this.emit('content', '\n\n');
  }

  handleFunctionCall() {
    if (this.responseResolve) {
      this.responseResolve();
      this.responseResolve = undefined;
    }
    this.activeFunctionCalls += 1;
  }

  handleFunctionCallResult() {
    this.activeFunctionCalls -= 1;
  }

  handleContent(content: string) {
    if (this.responseResolve) {
      this.responseResolve();
      this.responseResolve = undefined;
      queueMicrotask(() => {
        this.emit('content', content);
      });
      return;
    }
    this.emit('content', content);
  }
}
