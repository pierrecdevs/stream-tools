import { Command } from '../interfaces/Command';
import { CommandResult } from '../interfaces/CommandResult';

class CommandParser {
  private commands: Command[] = [];

  /**
   * Load commands from a file
   * @param {string} filePath - Path to the JSON file
   */
  async load(filepath: string) {
    try {
      const content = await fetch(filepath);
      const text = await content.json();
      Array.from(text?.commands || []).forEach((c) =>
        this.commands.push(c as Command),
      );
    } catch (ex) {
      const error = ex as Error;
      throw new Error(`load failed: ${error.message}`);
    }
  }

  parseCommand(
    input: string,
    patterns: string[] = [],
    replacements: any[] = [],
  ): CommandResult | null {
    for (const { pattern, response, action, argTypes } of this.commands) {
      const regex = new RegExp(pattern, 'i');
      const match = input.match(regex);

      if (match) {
        let processedResponse = response;

        processedResponse = processedResponse?.replace(
          /\$(\d+)/g,
          (_, groupIndex: string) => {
            return match[+groupIndex] || '';
          },
        );

        patterns.forEach((placeholder, index) => {
          const replacement = replacements[index] ?? '';
          processedResponse = processedResponse.replace(
            placeholder,
            replacement,
          );
        });

        const [command, ...args] = processedResponse.split(/\s+/);

        const formattedArgs = args.map((arg: any, index: number) => {
          const type = argTypes?.[index] || 'string';

          switch (type) {
            case 'number':
              return parseFloat(arg);
            case 'boolean':
              return arg.toLowerCase() === 'true';
            default:
              return arg;
          }
        });

        return {
          response: processedResponse,
          action,
          command,
          args: formattedArgs,
        };
      }
    }

    return null;
  }
}

export default CommandParser;
