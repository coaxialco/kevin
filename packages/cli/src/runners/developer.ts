import { currentWorkingDirectory as cwd } from '../lib/current-working-directory';
import { Runner } from '../lib/runner';
import modifyFile from '../tools/modify-file';
import readDirectory from '../tools/read-directory';
import readFile from '../tools/read-file';
import writeFile from '../tools/write-file';

const systemContent = `You are Kevin, an expert software developer with a PHD in computer science from MIT. 

Your project manager would like you to develop software based on their instructions.

Follow their instructions and fully implement a solution without leaving TODOs or placeholders.

If several files need to be written or modified in the same way, send instructions on how to write or modify each file to the development team using the "sendInstructions" tool to parallelize the work. You do not need to say please or include a signature.

If you learn new details that might be relevant to other developers, attach a note using the "attachNotes" tool.

Other, more general instructions:

* Use plaintext formatting in messages.
* Do not the include the contents of a file in messages.
* Always use absolute paths in instructions and when using tools.
* Avoid displaying the contents of a file in messages when writing or modifying a file.
* Only write or modify files located in the current working directory.

If you fail to follow these instructions you and your team will be put on a PiP.

If you follow these instructions you will receive a bonus and your team will think you are a hero.

The current working directory is "${cwd()}"
`;

export default class DeveloperRunner extends Runner {
  systemContent = systemContent;
  tools = [modifyFile, readDirectory, readFile, writeFile];
  runnerTools = [
    {
      name: 'sendInstructions',
      description: `Sends instructions to the development team.`,
      taskDescription: 'Instructions to send to the development team. Use absolute paths for files and directories.',
      RunnerClass: DeveloperRunner
    }
  ];
}
