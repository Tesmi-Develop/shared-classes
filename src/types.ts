import { Selector } from "@rbxts/reflex";
import { Shared } from "./source/Shared";
export type InferSharedClassState<T> = T extends Shared<infer S> ? S : never;
export type Constructor<T = object> = new (...args: never[]) => T;

export type SharedId = string;

export type Subscriber<S extends object, R = unknown> = {
	selector: Selector<S, R>;
	predicate?: (state: R, previousState: R) => boolean;
	callback: (state?: S, previousState?: S) => void;
};

export interface WrapSubscriber {
	OnlyServer: () => () => void;
	OnlyClient: () => () => void;
	Disconnect: () => void;
}
