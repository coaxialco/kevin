import { resolve } from 'path';
import { writeFile } from 'fs-extra';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { confirmWorkingDirectory } from '../lib/current-working-directory';
import wrap from '../lib/wrap-tool-function';
import { zodParseJSON } from '../lib/zod';

export const params = z.object({
  name: z.string().describe('The file path'),
  content: z.string().describe('The content to write')
});

export async function func({ name, content }: z.infer<typeof params>) {
  await confirmWorkingDirectory(name);
  console.log(`Wrote file: ${name}`);
  return await writeFile(name, content, 'utf-8');
}

export default {
  type: 'function',
  function: {
    name: 'writeFile',
    description: 'write to a UTF-8 formatted file',
    parameters: zodToJsonSchema(params),
    parse: zodParseJSON(params),
    function: wrap(func)
  }
} as RunnableToolFunction<z.infer<typeof params>>;
