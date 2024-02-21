import {
	BroadcastReceiver,
	Broadcaster,
	ProducerMap,
	ProducerMiddleware,
	createBroadcastReceiver,
	createBroadcaster,
} from "@rbxts/reflex";
import { remotes } from "../remotes";
import { rootProducer } from "../state/rootProducer";
import { Slices } from "../state/slices";
import { Constructor } from "../types";
import { CreateGeneratorId, IsClient, IsServer, logAssert, logWarning } from "../utilities";
import { Shared } from "./Shared";
import { Storage } from "./Storage";
import { ReplicatedStorage, RunService } from "@rbxts/services";
import { restoreNotChangedProperties } from "../restoreNotChangedProperties";
import { DISPATCH } from "../state/slices/replication";
import { SelectShared } from "../state/slices/selectors";
import Immut from "@rbxts/immut";
import { t } from "@rbxts/t";

const event = ReplicatedStorage.FindFirstChild("REFLEX_DEVTOOLS") as RemoteEvent;

interface ConstructorWithIndex<T extends object = object> extends Constructor<T> {
	__index: object;
}

const devToolMiddleware: ProducerMiddleware = () => {
	return (nextAction, actionName) => {
		return (...args) => {
			const state = nextAction(...args);
			if (RunService.IsStudio() && event) {
				event.FireServer({ name: actionName, args: [...args], state });
			}

			return state;
		};
	};
};

const restoreNotChangedStateMiddleware: ProducerMiddleware = () => {
	return (nextAction, actionName) => {
		return (...args) => {
			if (actionName === DISPATCH) {
				const [id, newState] = args as Parameters<(typeof rootProducer)[typeof DISPATCH]>;
				const typedAction = nextAction as (typeof rootProducer)[typeof DISPATCH];
				const oldState = rootProducer.getState(SelectShared(id));

				if (oldState === undefined || newState === undefined) return nextAction(...args);

				const validatedState = restoreNotChangedProperties(newState, oldState);

				return typedAction(id, validatedState);
			}

			return nextAction(...args);
		};
	};
};

export namespace SharedClasses {
	const generator = CreateGeneratorId(true);
	let broadcaster: Broadcaster;
	let receiver: BroadcastReceiver<ProducerMap>;
	let isStartedServer = false;
	let isStarterClient = false;

	export const RegisterySharedConstructor = (constructor: Constructor<Shared>) => {
		logAssert(!Storage.SharedClassesId.has(constructor), `Shared class with name ${constructor} already registery`);

		Storage.SharedClasses.set(`${constructor}`, constructor);
		Storage.SharedClassesId.set(constructor, `${constructor}`);
	};

	/**
	 * @hidden
	 * @internal
	 */
	export const GenerateId = () => generator.Next();

	export const AttachDevToolMiddleware = () => {
		rootProducer.applyMiddleware(devToolMiddleware);
	};

	/**
	 * @hidden
	 * @internal
	 */
	export const RegisterSharedInstance = (instance: Shared, id: string) => {
		Storage.SharedInstances.set(id, instance);
	};

	/**
	 * @hidden
	 * @internal
	 */
	export const RemoveSharedInstance = (id: string) => {
		Storage.SharedInstances.delete(id);
	};

	export const GetSharedInstanceFromId = (id: string) => {
		return Storage.SharedInstances.get(id);
	};

	export const StartServer = () => {
		logAssert(IsServer, "StartServer can only be used on the server");

		if (isStartedServer) return;
		isStartedServer = true;

		broadcaster = createBroadcaster({
			producers: Slices,
			hydrateRate: -1,

			beforeDispatch: (player, action) => {
				if (action.name !== DISPATCH) return action;

				const [id] = action.arguments as Parameters<(typeof rootProducer)[typeof DISPATCH]>;
				const shared = GetSharedInstanceFromId(id);
				logAssert(shared, `Component with id ${id} is not found`);
				const players = shared.ResolveReplicationForPlayers();

				if (!players) return action;

				if (!t.array(t.any)(players)) {
					return player === players ? action : undefined;
				}

				return players.includes(player) ? action : undefined;
			},

			beforeHydrate: (player, state) => {
				return Immut.produce(state, (draft) => {
					const states = draft.replication.States;

					states.forEach((_, id) => {
						const shared = GetSharedInstanceFromId(id);
						logAssert(shared, `Component with id ${id} is not found`);
						const players = shared.ResolveReplicationForPlayers();

						if (!players) return;

						if (!t.array(t.any)(players)) {
							return player !== players && states.delete(id);
						}

						return !players.includes(player) && states.delete(id);
					});
				});
			},

			dispatch: (player, actions) => {
				remotes._shared_class_dispatch.fire(player, actions);
			},
		});

		rootProducer.applyMiddleware(broadcaster.middleware);
		remotes._shared_class_start.connect((player) => broadcaster.start(player));
		initSharedClasses();
	};

	export const StartClient = () => {
		logAssert(IsClient, "StartClient can only be used on the server");

		if (isStarterClient) return;
		isStarterClient = true;

		receiver = createBroadcastReceiver({
			start: () => {
				remotes._shared_class_start.fire();
			},
		});

		remotes._shared_class_dispatch.connect((actions) => {
			receiver.dispatch(actions);
		});

		rootProducer.applyMiddleware(receiver.middleware, restoreNotChangedStateMiddleware);
		initSharedClasses();

		rootProducer.observe(
			(state) => state.replication.InstanceIds,
			(state, id) => id,
			(_, index) => {
				createClientInstance(index as string);
			},
		);
	};

	const createClientInstance = (id: string) => {
		const spiledId = id.split("-");
		const metadata = spiledId[1]; // example id: server-className-0
		const sharedClassConstructor = Storage.SharedClasses.get(metadata);
		if (!sharedClassConstructor) {
			logWarning(`Shared class with name ${metadata} not registery`);
			return;
		}
		const childSharedClass = Storage.SharedClassLinks.get(sharedClassConstructor)!;
		const args = rootProducer.getState().replication.InstanceArguments.get(id) ?? [];

		const instance = new childSharedClass(...(args as never[]));
		instance.Start();
		instance.SetServerId(spiledId[2]);
	};

	export const GetSharedDescendant = (constructor: Constructor<Shared<object>>) => {
		let currentClass = constructor as ConstructorWithIndex<Shared<object>>;
		let metatable = getmetatable(currentClass) as ConstructorWithIndex<Shared<object>>;

		while (currentClass && metatable.__index !== Shared) {
			currentClass = metatable.__index as ConstructorWithIndex<Shared<object>>;
			metatable = getmetatable(currentClass) as ConstructorWithIndex<Shared<object>>;
		}

		return currentClass;
	};

	const modifySharedConstructor = (constructor: Constructor<Shared<object>>) => {
		const typedConstructor = constructor as unknown as { constructor: (...args: unknown[]) => void };
		const originalConstructor = typedConstructor.constructor;

		typedConstructor.constructor = function (this, ...args) {
			const result = originalConstructor(this, ...args);
			const typedInstance = this as unknown as Shared<object>;
			rootProducer.SetInstanceArguments(typedInstance.GetFullId(), args);

			return result;
		};
	};

	const initSharedClasses = () => {
		const sharedClasses = new Map<string, Constructor<Shared<object>>>();
		Storage.SharedClasses.forEach((constructor) => {
			const sharedContructor = GetSharedDescendant(constructor);
			const anotherChildConstructor = Storage.SharedClassLinks.get(sharedContructor);

			logAssert(
				!anotherChildConstructor,
				`${constructor}, ${anotherChildConstructor} has same shared class ${sharedContructor}`,
			);

			if (RunService.IsServer()) {
				modifySharedConstructor(sharedContructor);
			}

			sharedClasses.set(`${sharedContructor}`, sharedContructor);
			Storage.SharedClassLinks.set(sharedContructor, constructor);
		});

		sharedClasses.forEach((constructor, id) => {
			Storage.SharedClasses.set(id, constructor);
		});
	};
}
