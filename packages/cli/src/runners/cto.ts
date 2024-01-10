import DeveloperTaskRunner from './developer-task';
import ctoContent from '../content/cto';
import { Runner } from '../lib/runner';
import modifyFile from '../tools/modify-file';
import readDirectory from '../tools/read-directory';
import readFile from '../tools/read-file';
import writeFile from '../tools/write-file';

export default class CtoRunner extends Runner {
  systemContent = ctoContent;
  tools = [modifyFile, readDirectory, readFile, writeFile];
  runnerTools = [
    {
      name: 'assignToDeveloper',
      description: 'Assign a task to a developer. Returns a list of messages and tool results from the developer.',
      taskDescription: 'A clear and precise description of the task to be performed.',
      RunnerClass: DeveloperTaskRunner
    }
  ];
}
