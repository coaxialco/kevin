import DeveloperRunner from './developer';
import systemContent from '../content/planner';
import { Runner } from '../lib/runner';
import readDirectory from '../tools/read-directory';
import readFile from '../tools/read-file';

export default class PlannerRunner extends Runner {
  systemContent = systemContent;
  tools = [readDirectory, readFile];
  runnerTools = [
    {
      name: 'assignToDeveloper',
      description: `Assign a task to a developer with a PHD in computer science from MIT. Returns the developer's response.`,
      taskDescription: 'A highly detailed description of the requested task.',
      RunnerClass: DeveloperRunner
    }
  ];
}
