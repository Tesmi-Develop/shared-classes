import { CreateGeneratorId, GetConstructorIdentifier, IsClient, IsServer } from "../utilities";
import { Storage } from "./Storage";
import { ClassProducer, CreatePatchBroadcaster, createPatchBroadcastReceiver } from "@rbxts/reflex-class";
import { Constructor } from "@flamework/core/out/utility";
import { BroadcastAction, ProducerMiddleware } from "@rbxts/reflex";
import { remotes } from "../remotes";
import { ReplicatedStorage, RunService } from "@rbxts/services";
import { Pointer } from "./pointer";
import { SharedInfo } from "../types";

const event = ReplicatedStorage.FindFirstChild("REFLEX_DEVTOOLS") as RemoteEvent;
const generatorId = CreateGeneratorId();

export abstract class Shared<S extends object = object> extends ClassProducer<S> {
	protected abstract state: S;
	protected previousState!: S;
	protected pointer: Pointer | undefined;
	private isStarted = false;
	protected broadcaster!: ReturnType<typeof CreatePatchBroadcaster<S>>;
	protected receiver!: ReturnType<typeof createPatchBroadcastReceiver>;
	private tree: Constructor[];
	private id: string;
	private connection?: () => void;
	/** @client */
	protected isBlockingServerDispatches = false;
	private isEnableDevTool = false;

	private getConstructor() {
		return getmetatable(this) as Constructor<Shared>;
	}

	constructor() {
		super();
		this.id = generatorId.Next();
		Storage.SharedClassById.set(this.id, this);
		const tree = Storage.SharedClasseTrees.get(this.getConstructor());
		assert(tree, `Shared class ${this.getConstructor()} is not decorated`);
		this.tree = tree;
	}

	public ResolveReplicationForPlayers(player: Player): boolean {
		return true;
	}

	public GetId() {
		return this.id;
	}

	/** @internal @hidden */
	public __SetId(id: string) {
		this.id = id;
	}

	/** @client */
	public AttachDevTool() {
		assert(IsClient, "Must be a client");
		this.isEnableDevTool = true;
	}

	/** @client */
	public DisableDevTool() {
		assert(IsClient, "Must be a client");
		this.isEnableDevTool = false;
	}

	/**
	 * @internal
	 * @hidden
	 **/
	public __DispatchFromServer(actions: BroadcastAction[]) {
		if (this.isBlockingServerDispatches) return;

		return this.receiver.dispatch(actions);
	}

	public GenerateInfo(): SharedInfo {
		return {
			Id: this.id,
			Arguments: Storage.SharedClasses.get(this.id)!,
			Identifier: GetConstructorIdentifier(this.getConstructor()),
			SharedIdentifier: GetConstructorIdentifier(this.tree[this.tree.size() - 1]),
			PointerID: this.pointer ? Pointer.GetPointerID(this.pointer) : undefined,
		};
	}

	private _onStartServer() {
		this.broadcaster = CreatePatchBroadcaster({
			producer: this.producer,
			dispatch: (player, actions) => {
				remotes._shared_class_dispatch.fire(player, actions, this.id);
			},

			beforeDispatch: (player: Player, action) => {
				return this.ResolveReplicationForPlayers(player) ? action : undefined;
			},

			beforeHydrate: (player, state) => {
				return this.ResolveReplicationForPlayers(player) ? state : undefined;
			},
		});

		this.connection = remotes._shared_class_start.connect(
			(player, id) => id === this.id && this.broadcaster.start(player),
		);

		remotes._shared_class_created_new_instance.fireAll(this.GenerateInfo());
		this.producer.applyMiddleware(this.broadcaster.middleware);
	}

	private _onStartClient() {
		const className = `${getmetatable(this)}`;
		this.receiver = createPatchBroadcastReceiver({
			start: () => {
				remotes._shared_class_start.fire(this.id);
			},

			OnHydration: () => {
				this.state = this.producer.getState();
			},

			OnPatch: (action) => {
				this.state = this.producer.getState();
				if (!this.isEnableDevTool || !event) return;

				event.FireServer({
					name: `${className}_serverDispatch`,
					args: [action],
					state: this.producer.getState(),
				});
			},
		});

		const devToolMiddleware: ProducerMiddleware = () => {
			return (nextAction) => {
				return (...args) => {
					const state = nextAction(...args);
					if (RunService.IsStudio() && event && this.isEnableDevTool) {
						event.FireServer({ name: `${className}_dispatch`, args: [...args], state });
					}

					return state;
				};
			};
		};

		this.producer.applyMiddleware(this.receiver.middleware, devToolMiddleware);
	}

	/**
	 * Start the function
	 */
	public Start() {
		if (this.isStarted) return;

		this.isStarted = true;

		IsServer && this._onStartServer();
		IsClient && this._onStartClient();
		this.onStart();

		return this;
	}

	protected onStart() {}

	protected onDestroy() {}

	public Destroy() {
		this.onDestroy();
		Storage.SharedClasses.delete(this.id);
		Storage.SharedClassById.delete(this.id);
		this.connection?.();

		IsServer && remotes._shared_class_destroy_instance.fireAll(this.id);
	}
}
