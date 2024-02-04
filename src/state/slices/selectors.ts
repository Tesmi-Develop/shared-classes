import { RootState } from "../rootProducer";

export function SelectShared(id: string) {
	return function (state: RootState) {
		return state.replication.States.get(id);
	};
}
