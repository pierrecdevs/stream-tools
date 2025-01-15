import Action from '../enums/action-enum';
import ArgType from '../enums/arg-type';

export interface Command {
  pattern: RegExp;
  response: string;
  action: Action;
  //argTypes?: ('string' | 'number' | 'boolean')[];
  argTypes?: ArgType[];
}
