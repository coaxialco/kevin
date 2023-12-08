import { resolve } from 'path';
import { readdir } from 'fs-extra';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { confirmWorkingDirectory } from '../lib/current-working-directory';
import wrap from '../lib/wrap-tool-function';
import { zodParseJSON } from '../lib/zod';

export const params = z.object({
  name: z.string().describe('The directory path'),
  recursive: z.boolean().describe('Recurse into subdirectories')
});

export async function func({ name, recursive }: z.infer<typeof params>) {
  await confirmWorkingDirectory(name, true);
  const entries = await readdir(name, { recursive });
  console.log(`Read directory${recursive ? ' recursively' : ''}: ${name}`);
  return entries.map((entry) => resolve(entry.toString()));
}

export default {
  type: 'function',
  function: {
    name: 'readDirectory',
    description: 'read entries in a directory',
    parameters: zodToJsonSchema(params),
    parse: zodParseJSON(params),
    function: wrap(func)
  }
} as RunnableToolFunction<z.infer<typeof params>>;
