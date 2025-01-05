export interface CommandResult {
  response: string;
  action: string;
  command: string;
  args: (string | number | boolean)[];
}

