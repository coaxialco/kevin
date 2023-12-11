import { readFile } from 'fs-extra';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { toolLogger } from '../lib/loggers';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import wrap from '../lib/wrap-tool-function';
import { zodParseJSON } from '../lib/zod';

export const params = z.object({
  filePath: z.string().describe('The relative or absolute file path'),
  includeLineNumbers: z.boolean().optional().default(false).describe('Include line numbers in the output')
});

export async function func({ filePath, includeLineNumbers }: z.infer<typeof params>) {
  toolLogger(`Reading file '${filePath}'${includeLineNumbers ? ' with line numbers' : ''}`);
  const content = await readFile(filePath, 'utf-8');
  if (!includeLineNumbers) {
    return content;
  }
  return content
    .split('\n')
    .map((line, index) => `${`${index + 1}`.padStart(6, ' ')} | ${line}`)
    .join('\n');
}

export default {
  type: 'function',
  function: {
    name: 'readFile',
    description: 'Reads the entire contents of a file using UTF-8 encoding',
    parameters: zodToJsonSchema(params),
    parse: zodParseJSON(params),
    function: wrap(func)
  }
} as RunnableToolFunction<z.infer<typeof params>>;
