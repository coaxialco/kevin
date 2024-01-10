import { readFile, exists } from 'fs-extra';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { toolLogger } from '../lib/loggers';
import wrap from '../lib/wrap-tool-function';
import { zodParseJSON } from '../lib/zod';

export const params = z.object({
  filePath: z.string().describe('The absolute path of the file to read')
});

export async function func({ filePath }: z.infer<typeof params>) {
  if (!(await exists(filePath))) {
    return `File with path "${filePath}" does not exist`;
  }
  toolLogger(`Reading file '${filePath}'`);
  const content = await readFile(filePath, 'utf-8');
  return content;
}

export default {
  type: 'function',
  function: {
    name: 'readFile',
    description:
      'Reads the entire contents of a file using UTF-8 encoding and returns a string containing the contents',
    parameters: zodToJsonSchema(params),
    parse: zodParseJSON(params),
    function: wrap(func)
  }
} as RunnableToolFunction<z.infer<typeof params>>;
