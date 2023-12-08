import OpenAI from 'openai';
import { terminal } from 'terminal-kit';
import { currentWorkingDirectory as cwd } from './lib/current-working-directory';
import multiLineInputGenerator from './lib/multi-line-input';
import currentWorkingDirectory from './tools/current-working-directory';
import readDirectory from './tools/read-directory';
import readFile from './tools/read-file';
import writeFile from './tools/write-file';

const openai = new OpenAI();

async function main() {
  const workingDirectory = cwd();
  const systemMessage = `
    You are a world-class software developer assisting your company's CTO.
    Use the provided functions to perform the tasks the CTO requests.
    When asked to write software, save the code to the filesystem using the provided functions.
    Do not output code to the console if it's being written to the filesystem.
    The current working directory is: ${workingDirectory}
    You can read or write files in the current working directory.
    The current date is: ${new Date().toUTCString()}
  `;
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemMessage.trim()
    }
  ];
  for await (const input of multiLineInputGenerator()) {
    messages.push({ role: 'user', content: input });
    const runner = openai.beta.chat.completions.runTools({
      model: 'gpt-4-1106-preview',
      stream: true,
      tools: [readFile, writeFile, readDirectory, currentWorkingDirectory],
      messages
    });
    runner.on('message', (message: object) => {
      messages.push({ role: 'user', content: input });
    });
    runner.on('content', (content: string) => terminal.bold(content));
    await runner.finalChatCompletion();
  }
}

main();
