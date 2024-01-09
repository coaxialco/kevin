import EventEmitter from 'events';
import { default as OpenAI } from 'openai';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { currentWorkingDirectory as cwd } from './current-working-directory';
import { toolLogger } from './loggers';
import wrap from './wrap-tool-function';
import { zodParseJSON } from './zod';
import modifyFile from '../tools/modify-file';
import readDirectory from '../tools/read-directory';
import readFile from '../tools/read-file';
import writeFile from '../tools/write-file';

const params = z.object({
  taskDescription: z.string().describe('A description of the task to be performed using absolute file paths')
});

const assignToDeveloperTool = (apiKey: string, parent: ChatRunner) =>
  ({
    type: 'function',
    function: {
      name: 'assignToDeveloper',
      description:
        'Assign a well-defined programming task to a developer. Returns a list of messages and tool results from the developer.',
      parameters: zodToJsonSchema(params),
      parse: zodParseJSON(params),
      function: wrap(async function ({ taskDescription }: z.infer<typeof params>) {
        toolLogger(`Assigning to developer:\n\n ${taskDescription.split('\n').join('\n> ')}`);
        const runner = new ChatRunner({ apiKey });
        runner.on('message', parent.handleMessage.bind(parent));
        runner.on('functionCall', parent.handleFunctionCall.bind(parent));
        runner.on('functionCallResult', parent.handleFunctionCall.bind(parent));
        runner.on('content', parent.handleContent.bind(parent));
        const result = await runner.sendMessage(taskDescription);
        return result;
      })
    }
  } as RunnableToolFunction<z.infer<typeof params>>);

export type ChatRunnerOptions = {
  apiKey: string;
};

export class ChatRunner extends EventEmitter {
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are Kevin, a CTO who loves to code. Use the provided tools to perform requested development tasks.

      When asked to perform a a task, you should:

      1. Read all files mentioned in the task description.
      2. Read all imported files, modules, and libraries that might be relevant.
      3. Write a concise description of the implementation steps you will take.
      4. Fully implement the solution without leaving TODOs or placeholders.

      Other, more general instructions:

      - Use the modifyFile function to make changes to files.
      - Do not repeat or paraphrase instructions.
      - Only use plaintext formatting in messages.
      - Avoid displaying the contents of a file in messages when writing or modifying a file.
      - Only write or modify files located in the current working directory.

      If you fail to follow these instructions you and your team will be put on a PiP.

      If you follow these instructions you will receive a bonus and your team will think you are a hero.

        The current working directory is: ${cwd()}
        The current date is: ${new Date().toUTCString()}`
        .split('\n')
        .map((line) => line.trim())
        .join('\n')
    }
  ];

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