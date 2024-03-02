import { Shared } from "../source/Shared";
import { SharedClass } from "../source/decorators";

interface State {
	Value: number;
}
@SharedClass()
export class ValueStorage extends Shared<State> {
	protected state = {
		Value: 0,
	};
}
