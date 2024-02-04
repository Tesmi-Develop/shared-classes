import { produce } from "@rbxts/immut";
import { createProducer } from "@rbxts/reflex";

type State = {
	States: ReadonlyMap<string, defined>;
	InstanceArguments: ReadonlyMap<string, unknown[]>;
};

const initialState: State = {
	States: new Map(),
	InstanceArguments: new Map(),
};

export const replicationSlice = createProducer(initialState, {
	Dispatch: (state, key: string, newState: defined) => {
		return produce(state, (draft) => {
			draft.States.set(key, newState);
		});
	},

	SetInstanceArguments: (state, key: string, args: unknown[]) => {
		return produce(state, (draft) => {
			draft.InstanceArguments.set(key, args);
		});
	},

	ClearInstance: (state, key: string) => {
		return produce(state, (draft) => {
			draft.States.delete(key);
			draft.InstanceArguments.delete(key);
		});
	},
});
