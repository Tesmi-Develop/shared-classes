import { Selector } from "@rbxts/reflex";
import { RootState, rootProducer } from "../state/rootProducer";
import { IsClient, IsServer, logAssert } from "../utilities";
import { Constructor, WrapSubscriber } from "../types";
import Maid from "@rbxts/maid";
import { Storage } from "./Storage";
import { subscribers } from "./decorators/subscribe";
import { SelectShared } from "../state/slices/selectors";

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

		IsClient &&
			this._maid.GiveTask(
				rootProducer.subscribe(SelectShared(this.GetFullId()), (state) => {
					if (state) return;
					this.Destroy();
				}),
			);

		this._maid.GiveTask(() => rootProducer.ClearInstance(this.GetFullId()));

		IsServer && rootProducer.Dispatch(this.GetFullId(), this.state);
		this.onStart();
	}

	protected onStart() {}

	protected onDestroy() {}

	public Destroy() {
		this.onDestroy();
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

	private updateState() {
		const oldState = this.state;
		this.state = (rootProducer.getState(SelectShared(this.GetFullId())) as S) ?? this.state;

		if (oldState !== this.state) {
			this.previousState = oldState;
		}
	}

	/**
	 * Dispatches the given state
	 *
	 * @param {S} state - the new state to be dispatched
	 */
	public Dispatch(state: S) {
		this.previousState = this.state;
		this.state = state;
		rootProducer.Dispatch(this.GetFullId(), this.state);
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
		const disconnect = rootProducer.subscribe(this.wrapSelector(selector), predicate, (state, previusState) => {
			this.updateState();
			listener(state, previusState);
		});
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

	protected flush() {
		rootProducer.flush();
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
		this.id && GetCore().RemoveSharedInstance(this.GetFullId());
		this.id && this.prefix !== Prefix.Server && rootProducer.ClearInstance(this.GetFullId());
		this.id = id;
		this.prefix = prefix;

		this.id && GetCore().RegisterSharedInstance(this, this.GetFullId());
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
					this.state = (state as S) ?? this.state;
					this.previousState = (previousState as S) ?? this.previousState;
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
					this.Subscribe(
						subscriber.selector,
						(state, previousState) => CallMethod(subscriber.callback, this, state as S, previousState as S),
						subscriber.predicate,
					).Disconnect,
				);
			});
		});
	}
}
