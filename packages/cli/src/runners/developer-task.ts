import developerTaskContent from '../content/developer-task';
import { Runner } from '../lib/runner';
import modifyFile from '../tools/modify-file';
import readDirectory from '../tools/read-directory';
import readFile from '../tools/read-file';
import writeFile from '../tools/write-file';

export default class DeveloperTaskRunner extends Runner {
  systemContent = developerTaskContent;
  tools = [modifyFile, readDirectory, readFile, writeFile];
}
