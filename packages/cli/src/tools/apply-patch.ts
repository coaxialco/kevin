import { applyPatch } from 'diff';
import { writeFile, readFile } from 'fs-extra';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { confirmWorkingDirectory } from '../lib/current-working-directory';
import wrap from '../lib/wrap-tool-function';
import { zodParseJSON } from '../lib/zod';

export const params = z.object({
  name: z.string(),
  patch: z.string()
});

export async function func({ name, patch }: z.infer<typeof params>) {
  await confirmWorkingDirectory(name);
  const oldContent = await readFile(name, 'utf-8');
  const newContent = applyPatch(oldContent, patch);
  if (newContent === false) {
    throw new Error(`Unable to patch ${name}`);
  }
  await writeFile(name, newContent, 'utf-8');
  console.log(`Patched ${name}: \n${patch}`);
}

export default {
  type: 'function',
  function: {
    name: 'applyPatch',
    description: 'Apply a unified diff patch to a file',
    parameters: zodToJsonSchema(params),
    parse: zodParseJSON(params),
    function: wrap(func)
  }
} as RunnableToolFunction<z.infer<typeof params>>;
