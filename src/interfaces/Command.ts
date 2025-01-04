export interface Command {
  pattern: RegExp;
  response: string;
  action: any;
  params?: RegExpMatchArray | null;
}
