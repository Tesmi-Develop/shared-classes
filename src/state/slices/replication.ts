import { produce } from "@rbxts/immut";
import { createProducer } from "@rbxts/reflex";

type State = {
	States: ReadonlyMap<string, defined>;
	InstanceArguments: ReadonlyMap<string, unknown[]>;
	InstanceIds: Set<string>;
};

const initialState: State = {
	States: new Map(),
	InstanceArguments: new Map(),
	InstanceIds: new Set(),
};

export const replicationSlice = createProducer(initialState, {
	Dispatch: (state, key: string, newState: defined) => {
		return produce(state, (draft) => {
			draft.States.set(key, newState);
			draft.InstanceIds.add(key);
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
			draft.InstanceIds.delete(key);
		});
	},
});
