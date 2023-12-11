import { resolve } from 'path';
import { readdir } from 'fs-extra';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { toolLogger } from '../lib/loggers';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { confirmWorkingDirectory } from '../lib/current-working-directory';
import wrap from '../lib/wrap-tool-function';
import { zodParseJSON } from '../lib/zod';

export const params = z.object({
  directoryPath: z.string().describe('The relative or absolute directory path'),
  recursive: z.boolean().describe('Recurse into subdirectories')
});

export async function func({ directoryPath, recursive }: z.infer<typeof params>) {
  const entries = await readdir(directoryPath, { recursive });
  toolLogger(`Read directory${recursive ? ' recursively' : ''}: ${directoryPath}`);
  return entries.map((entry) => resolve(entry.toString()));
}

export default {
  type: 'function',
  function: {
    name: 'readDirectory',
    description: 'Reads the contents of a directory.',
    parameters: zodToJsonSchema(params),
    parse: zodParseJSON(params),
    function: wrap(func)
  }
} as RunnableToolFunction<z.infer<typeof params>>;
