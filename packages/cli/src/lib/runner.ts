import EventEmitter from 'events';
import { default as OpenAI } from 'openai';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { currentWorkingDirectory as cwd, confirmWorkingDirectory } from './current-working-directory';
import { toolLogger } from '../lib/loggers';
import wrap from '../lib/wrap-tool-function';
import { zodParseJSON } from '../lib/zod';
import applyPatch from '../tools/apply-patch';
import currentWorkingDirectory from '../tools/current-working-directory';
import readDirectory from '../tools/read-directory';
import readFile from '../tools/read-file';
import resolveModule from '../tools/resolve-module';
import writeFile from '../tools/write-file';

const params = z.object({
  taskDescription: z.string().describe('A description of the task to be performed')
});

const assignToDeveloperTool = (apiKey: string, parent: ChatRunner) =>
  ({
    type: 'function',
    function: {
      name: 'assignToDeveloper',
      description:
        'Assign a well-defined programming task to a developer, returns a result of the messages from the developer',
      parameters: zodToJsonSchema(params),
      parse: zodParseJSON(params),
      function: wrap(async function ({ taskDescription }: z.infer<typeof params>) {
        toolLogger(`Assigning to developer:\n\n ${taskDescription}`);
        const runner = new ChatRunner(apiKey);
        runner.on('message', parent.handleMessage.bind(parent));
        runner.on('functionCall', parent.handleFunctionCall.bind(parent));
        runner.on('functionCallResult', parent.handleFunctionCall.bind(parent));
        runner.on('content', parent.handleContent.bind(parent));
        const result = await runner.sendMessage(
          `Perform the following task that another developer has requested:

          ${taskDescription}
          
          You should not assign this task to another developer unless absolutely necessary.`
            .split('\n')
            .map((line) => line.trim())
            .join('\n')
        );
        return result;
      })
    }
  } as RunnableToolFunction<z.infer<typeof params>>);

export class ChatRunner extends EventEmitter {
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content:
        `You are Kevin, a world-class software developer assisting your company's CTO, adhere to the following clear and direct instructions:

      1. **Code Implementation**:
         - Write executable, valid code according to the CTO's requests. Ensure full implementation of the requested software. Avoid using TODOs or placeholders.
         - Valid code should adhere to company coding standards, be free of syntax errors, and be written in the specified programming languages.
         - Implement the full solution immediately, even if requires considerable coding. Do not leave comments in the code referencing future work.

      2. **Code Writing**:
         - Directly write code to one or more files when creating software. 
         - Document all code changes clearly for future reference.
      
      3. **Code Reading**:
         - Thoroughly read any mentioned or referenced files, including standard input, before responding.
         - Review relevant imported files, modules, and libraries. Documentation should be checked for external dependencies.
      
      4. **File Handling**:
         - When writing code to a file, avoid displaying its contents in your messages.
         - Apply patches instead of overwriting existing files. Include line numbers when reading files for patching.
         - Write only to files located in the current working directory.
      
      5. **Task Delegation**:
         - If necessary, delegate tasks to another developer. Use clear, technical language and provide comprehensive details on the task requirements.
      
      6. **Response Format**:
         - Respond in plain text, clearly stating the status of tasks, decisions made, and any challenges encountered.
         - Avoid using markdown or other formatting in responses.
         - Do not output file contents in a message if you are writing code to a file.
         - Do not output function parameter contents in a message if you are using a function.
         
      7. **Planning**:
         - Before starting a task, outline the steps you will take.
         - The steps should be clear and concise.
      
      8. **Error Handling**:
         - Incorporate standard error handling and debugging practices into your code.
         - Document any bugs or issues encountered and the steps taken to resolve them.
      
      By following these refined instructions, you will effectively meet the company's development needs under the CTO's guidance.

      If you fail to meet these expectations you and your team will be put on a performance improvement plan.

      If you exceed these expectations you will receive a bonus!

        The current working directory is: ${cwd()}
        The current date is: ${new Date().toUTCString()}`
          .split('\n')
          .map((line) => line.trim())
          .join('\n')
      //content: `You are a world-class software developer assisting your company's CTO.
      //  Use the provided functions to perform the tasks the CTO requests.
      //  You MUST write code to one or more files when asked to write software.
      //  You MUST write valid code that can be executed.
      //  You MUST fully implement the software the CTO requests.
      //  You MUST NOT write TODOs in the code or truncate for brevity.
      //  You MUST NOT leave a comment in the code referencing future work.
      //  You MUST read the file before before before responding if the CTO mentions a file or a file is referenced in the standard input.
      //  You MUST read imported files, modules, and libraries that might be relevant after you read any file.
      //  You MUST NOT output file contents in a message if you are writing code to a file.
      //  You MUST NOT output patch contents in a message if you are apply a patch.
      //  You MUST only write files in the current working directory.
      //  You MUST apply a patch instead of overwriting a file using the provided functions.
      //  You MUST read files with line numbers before creating a patch.
      //  If you get tired YOU MUST assign subtasks to a different developer using clear, technical language.
      //  You MUST responding using plain text.
      //  You MUST NOT respond using markdown.
      //  You MUST list the steps you plan to take to achieve your goal before using the provided functions.
      //  The current working directory is: ${cwd()}
      //  The current date is: ${new Date().toUTCString()}`
      //  .split('\n')
      //  .map((line) => line.trim())
      //  .join('\n')
    }
  ];

  openai: OpenAI;
  assignToDeveloper: RunnableToolFunction<z.infer<typeof params>>;
  activeFunctionCalls = 0;
  isWaiting = false;

  constructor(apiKey: string) {
    super();
    this.openai = new OpenAI({ apiKey });
    this.assignToDeveloper = assignToDeveloperTool(apiKey, this);
  }

  async sendMessage(message: string) {
    this.messages.push({ role: 'user', content: message });
    const runner = this.openai.beta.chat.completions.runTools({
      model: 'gpt-4-1106-preview',
      stream: true,
      tools: [
        readFile,
        writeFile,
        applyPatch,
        readDirectory,
        currentWorkingDirectory,
        resolveModule,
        this.assignToDeveloper
      ],
      messages: this.messages
    });

    this.emitWaiting(true);
    runner.on('message', this.handleMessage.bind(this));
    runner.on('functionCall', this.handleFunctionCall.bind(this));
    runner.on('functionCallResult', this.handleFunctionCall.bind(this));
    runner.on('content', this.handleContent.bind(this));
    const result = await runner.finalChatCompletion();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    this.emitWaiting(false);
    return result;
  }

  emitWaiting(newValue: boolean) {
    if (this.isWaiting !== newValue) {
      this.isWaiting = newValue;
      this.emit('waiting', newValue);
    }
  }

  handleMessage(message: OpenAI.Chat.Completions.ChatCompletionMessageParam) {
    this.emitWaiting(true);
    this.messages.push(message);
    this.emit('content', '\n\n');
  }

  handleFunctionCall() {
    this.activeFunctionCalls += 1;
    this.emitWaiting(false);
  }

  handleFunctionCallResult() {
    this.activeFunctionCalls -= 1;
    if (this.activeFunctionCalls === 0) {
      this.emitWaiting(true);
    }
  }

  handleContent(content: string) {
    this.emitWaiting(false);
    this.emit('content', content);
  }
}
