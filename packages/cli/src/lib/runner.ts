import EventEmitter from 'events';
import { default as OpenAI } from 'openai';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { toolLogger } from './loggers';
import wrap from './wrap-tool-function';
import { zodParseJSON } from './zod';

export type RunnerOptions = {
  apiKey: string;
};

export class Runner extends EventEmitter {
  systemContent?: string = '';
  tools: RunnableToolFunction<any>[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  runnerTools: {
    name: string;
    description: string;
    taskDescription: string;
    RunnerClass: typeof Runner;
  }[] = [];
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  response: Promise<void>;
  apiKey: string;

  private activeFunctionCalls = 0;
  private responseResolve: void | (() => void) = undefined;

  constructor({ apiKey }: RunnerOptions) {
    super();
    this.apiKey = apiKey;
    this.response = new Promise<void>((resolve) => {
      this.responseResolve = resolve;
    });
  }

  async sendMessage(message: string) {
    if (typeof this.systemContent === 'string') {
      this.messages.push({
        role: 'system',
        content: this.systemContent
      });
      delete this.systemContent;
    }
    while (this.runnerTools.length > 0) {
      const runnerTool = this.runnerTools.shift();
      if (typeof runnerTool === 'undefined') {
        continue;
      }
      const { name, description, taskDescription, RunnerClass } = runnerTool;
      const params = z.object({
        task: z.string().describe(taskDescription)
      });
      this.tools.push({
        type: 'function',
        function: {
          name,
          description,
          parameters: zodToJsonSchema(params),
          parse: zodParseJSON(params),
          function: wrap(async ({ task }: z.infer<typeof params>) => {
            this.emit('content', `Assigning to ${RunnerClass.name}:\n\n${task}`);
            const runner = new RunnerClass({ apiKey: this.apiKey });
            this.emit('handoff', runner);
            const result = await runner.sendMessage(task);
            runner.emit('handoff', this);
            const choice = result.choices[0];
            if (typeof choice === 'undefined') {
              throw new Error(`No message returned from ${RunnerClass.name} runner`);
            }
            return choice.message.content;
          })
        }
      } as RunnableToolFunction<z.infer<typeof params>>);
    }
    this.messages.push({ role: 'user', content: message });
    const openai = new OpenAI({ apiKey: this.apiKey });
    const runner = openai.beta.chat.completions.runTools({
      model: 'gpt-4-1106-preview',
      stream: true,
      tools: this.tools,
      messages: this.messages
    });
    runner.on('message', this.handleMessage.bind(this));
    runner.on('functionCall', this.handleFunctionCall.bind(this));
    runner.on('functionCallResult', this.handleFunctionCall.bind(this));
    runner.on('content', this.handleContent.bind(this));
    const result = await runner.finalChatCompletion();
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
