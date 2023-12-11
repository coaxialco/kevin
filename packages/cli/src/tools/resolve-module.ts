import { extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { exists } from 'fs-extra';
import { resolve } from 'import-meta-resolve';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { toolLogger } from '../lib/loggers';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import wrap from '../lib/wrap-tool-function';
import { zodParseJSON } from '../lib/zod';

export const params = z.object({
  moduleSpecifier: z
    .string()
    .describe(
      'A string that specifies a potentially importable module. This may be a relative path (such as "./lib/helper.js"), a bare name (such as "my-module"), or an absolute path (such as "/Users/foo/projects/example/lib/helper.js")'
    ),
  filePath: z.string().describe('The relative or absolute file path from which the import will be resolved')
});

export async function func({ moduleSpecifier, filePath }: z.infer<typeof params>) {
  toolLogger(`Resolving module '${moduleSpecifier}' from '${filePath}'`);
  const resolved = resolve(moduleSpecifier, pathToFileURL(filePath).href);
  if (!resolved.startsWith('file:')) {
    return resolved;
  }
  const resolvedPath = fileURLToPath(resolved);
  if (extname(resolvedPath) !== '') {
    return resolvedPath;
  }
  for (const extension of ['js', 'ts']) {
    const pathWithExtension = `${resolvedPath}.${extension}`;
    if (await exists(pathWithExtension)) {
      return pathWithExtension;
    }
  }
  throw new Error(`Could not resolve module '${moduleSpecifier}' from '${filePath}'`);
}

export default {
  type: 'function',
  function: {
    name: 'resolveModule',
    description: 'Resolves a JavaScript or TypeScript module specifier to a file path',
    parameters: zodToJsonSchema(params),
    parse: zodParseJSON(params),
    function: wrap(func)
  }
} as RunnableToolFunction<z.infer<typeof params>>;
