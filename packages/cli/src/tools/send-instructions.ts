import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { toolLogger } from '../lib/loggers';
import wrap from '../lib/wrap-tool-function';
import { zodParseJSON } from '../lib/zod';

export const params = z.object({
  instructions: z.string().describe('Instructions to send to the development team using absolute paths')
});

export async function func({ instructions }: z.infer<typeof params>) {
  toolLogger(`Instructions: '${instructions}'`);
  return "OK, that's complete.";
}

export default {
  type: 'function',
  function: {
    name: 'sendInstructions',
    description: 'Sends instructions to the development team',
    parameters: zodToJsonSchema(params),
    parse: zodParseJSON(params),
    function: wrap(func)
  }
} as RunnableToolFunction<z.infer<typeof params>>;
