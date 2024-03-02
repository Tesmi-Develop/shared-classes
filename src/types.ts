import { Shared } from "./source/Shared";
export type InferSharedClassState<T> = T extends Shared<infer S> ? S : never;

export interface WrapSubscriber {
	OnlyServer: () => () => void;
	OnlyClient: () => () => void;
	Disconnect: () => void;
}

export interface SharedInfo {
	Identifier: string;
	Id: string;
	Arguments: Map<string, unknown[]>;
	SharedIdentifier: string;
	PointerID?: string;
}
