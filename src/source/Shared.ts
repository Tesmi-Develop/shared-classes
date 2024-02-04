import { Selector } from "@rbxts/reflex";
import { RootState, rootProducer } from "../state/rootProducer";
import { IsClient, IsServer, logAssert } from "../utilities";
import { Constructor, WrapSubscriber } from "../types";
import Maid from "@rbxts/maid";
import { Storage } from "./Storage";
import { subscribers } from "./decorators/subscribe";

function CallMethod<T extends Callback>(func: T, context: InferThis<T>, ...parameters: Parameters<T>): ReturnType<T> {
	return func(context, ...(parameters as unknown[]));
}

enum Prefix {
	Server = "Server",
	Client = "Client",
}

const GetCore = () => {
	return import("./Core").expect().SharedClasses;
};

export abstract class Shared<S extends object = object> {
	protected abstract state: S;
	protected previousState!: S;
	private isStarted = false;
	private id!: string;
	private prefix!: string;
	private metadata: string;
	private _maid = new Maid();

	constructor() {
		logAssert(
			Storage.SharedClassesId.has(getmetatable(this) as Constructor<Shared>),
			`Shared class with name ${getmetatable(this)} not decorated`,
		);
		this.metadata = `${GetCore().GetSharedDescendant(getmetatable(this) as Constructor<Shared>)}`;
		this.applyId();
	}

	/**
	 * Start the function
	 */
	public Start() {
		if (this.isStarted) return;

		this.isStarted = true;
		this.previousState = this.state;

		this.initSubscribers();
		this.subcribeState();

		IsServer && rootProducer.Dispatch(this.GetFullId(), this.state);
		this.onStart();
	}

	protected onStart() {}

	public Destroy() {
		this._maid.Destroy();
	}

	/**
	 * Get the full ID of the object.
	 *
	 * @return {string} the full ID
	 */
	public GetFullId(): string {
		return `${this.prefix}-${this.metadata}-${this.id}`;
	}

	/**
	 * Get the state of the object.
	 *
	 * @return {S} the state
	 */
	public GetState(): S {
		return this.state as Readonly<S>;
	}

	/**
	 * Subscribe to changes in the state and attach a listener.
	 *
	 * @param {Selector<S, R>} selector - the selector function
	 * @param {(state: R, previousState: R) => void} listener - the listener function
	 * @param {(state: R) => boolean} [predicate] - optional predicate function
	 * @return {WrapSubscriber} subscriber object
	 */
	public Subscribe<R>(
		selector: Selector<S, R>,
		listener: (state: R, previousState: R) => void,
		predicate?: (state: R, previousState: R) => boolean,
	): WrapSubscriber {
		const disconnect = rootProducer.subscribe(this.wrapSelector(selector), predicate, listener);
		const subscriber = {
			Disconnect: disconnect,

			OnlyServer: () => {
				if (!IsServer) return disconnect;
				disconnect();

				return disconnect;
			},

			OnlyClient: () => {
				if (!IsClient) return disconnect;
				disconnect();

				return disconnect;
			},
		};

		return subscriber;
	}

	/**
	 * @internal
	 * @hidden
	 */
	public SetServerId(id: string) {
		this.changeId(Prefix.Server, id);
	}

	private applyId() {
		const id = GetCore().GenerateId();
		this.changeId(IsServer ? Prefix.Server : Prefix.Client, id);
	}

	private changeId(prefix: Prefix, id: string) {
		this.id && this.prefix !== Prefix.Server && rootProducer.ClearInstance(this.id);
		this.id = id;
		this.prefix = prefix;

		// This method has to be called in the constructor when the state is not ready yet
		if (!this.state) {
			return;
		}

		if (IsServer || (IsClient && prefix === Prefix.Client)) {
			rootProducer.Dispatch(this.GetFullId(), this.state);
		}

		rootProducer.flush();
	}

	private subcribeState() {
		this.previousState = this.state;

		this._maid.GiveTask(
			rootProducer.subscribe(
				(state) => state.replication.States.get(this.GetFullId()),
				(state, previousState) => {
					this.state = state as S;
					this.previousState = previousState as S;
				},
			),
		);
	}

	private wrapSelector<R>(selector: Selector<S, R>) {
		return (state: RootState) => {
			const componentState = state.replication.States.get(this.GetFullId());
			if (!componentState) {
				return selector(this.state);
			}
			return selector(componentState as S);
		};
	}

	private initSubscribers() {
		const subscribes = subscribers.get(GetCore().GetSharedDescendant(getmetatable(this) as Constructor<Shared>));
		if (!subscribes) return;

		task.spawn(() => {
			subscribes.forEach((subscriber) => {
				this._maid.GiveTask(
					rootProducer.subscribe<unknown>(
						this.wrapSelector(subscriber.selector),
						subscriber.predicate,
						(state, previousState) => CallMethod(subscriber.callback, this, state as S, previousState as S),
					),
				);
			});
		});
	}
}
