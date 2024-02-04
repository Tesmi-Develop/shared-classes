import { Selector } from "@rbxts/reflex";
import { Constructor, InferSharedClassState, Subscriber } from "../../types";
import { RunService } from "@rbxts/services";
import type { Shared } from "../Shared";

export const subscribers = new Map<object, Subscriber<object>[]>();

const GetCore = () => {
	return import("../Core").expect().SharedClasses;
};

/**
 * Subscribe to changes in the state and attach a listener.
 *
 * @param {string} side - The side of the communication ("Server" | "Client" | "Both")
 * @param {Selector<InferSharedClassState<T>, R>} selector - The selector function
 * @param {(state: InferSharedClassState<T>, previousState: InferSharedClassState<T>) => void} predicate - The predicate function
 */
export const SharedSubscribe = <T extends Shared<S>, S extends object, R>(
	side: "Server" | "Client" | "Both",
	selector: Selector<InferSharedClassState<T>, R>,
	predicate?: (state: R, previousState: R) => boolean,
) => {
	return (
		target: T,
		propertyKey: string,
		descriptor: TypedPropertyDescriptor<(this: T, state?: R, previousState?: R) => void>,
	) => {
		if (side === "Server" && !RunService.IsServer()) return;
		if (side === "Client" && !RunService.IsClient()) return;

		Subscribe(selector, predicate)(target, propertyKey, descriptor);
	};
};

/**
 * Subscribe to changes in the state and attach a listener.
 *
 * @param {Selector<InferSharedClassState<T>, R>} selector - The selector function
 * @param {(state: InferSharedClassState<T>, previousState: InferSharedClassState<T>) => void} predicate - The predicate function
 */
export const Subscribe = <T extends Shared<S>, S extends object, R>(
	selector: Selector<InferSharedClassState<T>, R>,
	predicate?: (state: R, previousState: R) => boolean,
) => {
	return (
		target: T,
		propertyKey: string,
		descriptor: TypedPropertyDescriptor<(this: T, state?: R, previousState?: R) => void>,
	) => {
		const originalMethod = descriptor.value;
		const sharedConstructor = GetCore().GetSharedDescendant(target as unknown as Constructor<T>);
		let subscribes = subscribers.get(sharedConstructor);

		if (!subscribes) {
			subscribes = [];
			subscribers.set(sharedConstructor, subscribes);
		}

		subscribes.push({
			selector: selector as never,
			predicate: predicate as never,
			callback: originalMethod as never,
		});
	};
};
