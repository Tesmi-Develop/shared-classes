import { Shared } from "../source/Shared";
import { Action, SharedSubscribe } from "../source/decorators";

interface State {
	Value: number;
}

export class ValueStorage extends Shared<State> {
	protected state = {
		Value: 0,
	};
}
