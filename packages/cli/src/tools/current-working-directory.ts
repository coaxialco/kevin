import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { toolLogger } from '../lib/loggers';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { currentWorkingDirectory } from '../lib/current-working-directory';
import wrap from '../lib/wrap-tool-function';
import { zodParseJSON } from '../lib/zod';

export const params = z.object({});

export function func() {
  const cwd = currentWorkingDirectory();
  toolLogger(`Got current working directory: ${cwd}`);
  return cwd;
}

export default {
  type: 'function',
  function: {
    name: 'currentWorkingDirectory',
    description: 'get the current working directory',
    parameters: zodToJsonSchema(params),
    parse: zodParseJSON(params),
    function: wrap(func)
  }
} as RunnableToolFunction<z.infer<typeof params>>;
