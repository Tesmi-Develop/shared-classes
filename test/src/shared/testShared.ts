import { Shared } from "../source/Shared";

interface State {
	Value: number;
}

export class ValueStorage extends Shared<State> {
	protected state = {
		Value: 0,
	};
}
