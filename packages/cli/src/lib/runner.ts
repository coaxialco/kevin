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
  notes?: string[];
};

export type RunnerTool = {
  name: string;
  description: string;
  taskDescription: string;
  RunnerClass: typeof Runner;
};

export class Runner extends EventEmitter {
  systemContent?: string = '';
  tools: RunnableToolFunction<any>[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  runnerTools: RunnerTool[] = [];
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  response: Promise<void>;
  apiKey: string;
  notes: string[];

  private activeFunctionCalls = 0;
  private responseResolve: void | (() => void) = undefined;

  constructor({ apiKey, notes = [] }: RunnerOptions) {
    super();
    this.apiKey = apiKey;
    this.response = new Promise<void>((resolve) => {
      this.responseResolve = resolve;
    });
    this.notes = notes;
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
            const runner = new RunnerClass({ apiKey: this.apiKey, notes: this.notes });
            this.emit('handoff', runner);
            const result = await runner.sendMessage(
              `# Notes\n\n${this.notes.join('\n\n')}\n\n# Instructions\n\n${task}`
            );
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
      //model: 'gpt-4',
      stream: true,
      tools: [...this.tools, this.attachNotesTool],
      messages: this.messages
    });
    runner.on('message', this.handleMessage.bind(this));
    runner.on('functionCall', this.handleFunctionCall.bind(this));
    runner.on('functionCallResult', this.handleFunctionCall.bind(this));
    runner.on('content', this.handleContent.bind(this));
    const result = await runner.finalChatCompletion();
    toolLogger(JSON.stringify(result, null, 2));
    return result;
  }

  get attachNotesTool() {
    const params = z.object({
      notes: z.string().describe('Notes for the development team')
    });

    const func = async ({ notes }: z.infer<typeof params>) => {
      toolLogger(`Notes:\n${notes}\n`);
      this.notes.push(notes);
      return 'Your notes have been saved';
    };

    return {
      type: 'function',
      function: {
        name: 'attachNotes',
        description: 'Attaches notes for the development team',
        parameters: zodToJsonSchema(params),
        parse: zodParseJSON(params),
        function: wrap(func)
      }
    } as RunnableToolFunction<z.infer<typeof params>>;
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
