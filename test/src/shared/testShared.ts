import { Shared } from "../source/Shared";

interface State {
	Value: number;
	Config: {
		Name: string;
	};
}

export class ValueStorage extends Shared<State> {
	protected state = {
		Value: 0,
		Config: {
			Name: "Da",
		},
	};
}
