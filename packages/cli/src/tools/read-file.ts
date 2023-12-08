import { readFile } from 'fs-extra';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { confirmWorkingDirectory } from '../lib/current-working-directory';
import wrap from '../lib/wrap-tool-function';
import { zodParseJSON } from '../lib/zod';

export const params = z.object({
  name: z.string().describe('The file path')
});

export async function func({ name }: z.infer<typeof params>) {
  await confirmWorkingDirectory(name);
  console.log(`Read file: ${name}`);
  return await readFile(name, 'utf-8');
}

export default {
  type: 'function',
  function: {
    name: 'readFile',
    description: 'read a UTF-8 formatted file',
    parameters: zodToJsonSchema(params),
    parse: zodParseJSON(params),
    function: wrap(func)
  }
} as RunnableToolFunction<z.infer<typeof params>>;
