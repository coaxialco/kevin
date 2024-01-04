import { dirname } from 'path';
import { writeFile, ensureDir } from 'fs-extra';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { confirmWorkingDirectory } from '../lib/current-working-directory';
import { toolLogger } from '../lib/loggers';
import wrap from '../lib/wrap-tool-function';
import { zodParseJSON } from '../lib/zod';

export const params = z.object({
  filePath: z.string().describe('The relative or absolute file path'),
  content: z.string().describe('The content to write')
});

export async function func({ filePath, content }: z.infer<typeof params>) {
  await confirmWorkingDirectory(filePath);
  await ensureDir(dirname(filePath));
  toolLogger(`Wrote file: ${filePath}`);
  await writeFile(filePath, content, 'utf-8');
}

export default {
  type: 'function',
  function: {
    name: 'writeFile',
    description: 'Writes data to a file using UTF-8 encoding, replacing the file if it already exists and returns void',
    parameters: zodToJsonSchema(params),
    parse: zodParseJSON(params),
    function: wrap(func)
  }
} as RunnableToolFunction<z.infer<typeof params>>;
