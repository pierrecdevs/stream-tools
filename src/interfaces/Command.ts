export interface Command {
  pattern: RegExp;
  response: string;
  action: 'chat' | 'speak' | 'obs';
  argTypes?: ('string' | 'number' | 'boolean')[];
}
