import { CreateGeneratorId, DeepCloneTable, GetConstructorIdentifier, IsClient, IsServer } from "../utilities";
import { Storage } from "./Storage";
import { ClassProducer } from "@rbxts/reflex-class";
import { AbstractConstructor, Constructor } from "@flamework/core/out/utility";
import { remotes } from "../remotes";
import { Players, ReplicatedStorage, RunService } from "@rbxts/services";
import { Pointer } from "./pointer";
import { SharedInfo } from "../types";
import { ClientSyncer, sync, SyncPatch, SyncPayload } from "@rbxts/charm";
import { SharedClasses } from "./Core";

const event = ReplicatedStorage.FindFirstChild("REFLEX_DEVTOOLS") as RemoteEvent;
const generatorId = CreateGeneratorId();

export abstract class Shared<S> extends ClassProducer<S> {
	protected abstract state: S;
	protected previousState!: S;
	protected pointer: Pointer | undefined;
	private isStarted = false;
	protected receiver!: ClientSyncer<{}>;
	private tree: AbstractConstructor[];
	private id!: string;
	private connection?: () => void;
	/** @client */
	protected isBlockingServerDispatches = false;
	private isEnableDevTool = false;
	private broadcastConnection?: () => void;

	private getConstructor() {
		return getmetatable(this) as Constructor<Shared<S>>;
	}

	constructor() {
		super();
		if (IsServer) {
			this.id = generatorId.Next();
			Storage.SharedClassById.set(this.id, this);
		}
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
		Storage.SharedClassById.set(this.id, this);
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
	public __DispatchFromServer(payload: SyncPayload<{}>) {
		if (this.isBlockingServerDispatches) return;

		this.receiver.sync(payload);

		if (!RunService.IsStudio() || !this.isEnableDevTool) return;
		event.FireServer({
			name: `${getmetatable(this)}_serverDispatch`,
			args: [],
			state: this.atom(),
		});
	}

	/**
	 * Determines whether the given sync patch is allowed to be synced for the specified player.
	 * WARNING: Argument data is read-only!!!.
	 *
	 * @param {Player} player - The player for whom the sync patch is being resolved.
	 * @param {SyncPatch<S>} data - The sync patch to be resolved.
	 * @return {boolean} Returns `true` if the sync patch is allowed to be synced for the player, `false` otherwise.
	 */
	public ResolveIsSyncForPlayer(player: Player, data: SyncPatch<S>): boolean {
		return true;
	}

	/**
	 * Resolves the sync data for a specific player.
	 *
	 * @param {Player} player - The player for whom the sync data is being resolved.
	 * @param {SyncPatch<S>} data - The sync data to be resolved.
	 * @return {SyncPatch<S>} - The resolved sync data.
	 */
	public ResolveSyncForPlayer(player: Player, data: SyncPatch<S>): SyncPatch<S> {
		return data;
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
		const observer = SharedClasses.GetAtomObserver();

		const generatePayload = (payload: SyncPatch<S>) => {
			return {
				type: "patch",
				data: {
					atom: payload,
				},
			};
		};

		this.broadcastConnection = observer.Connect(this.atom, (patch) => {
			const originalPayload = generatePayload(patch);

			Players.GetPlayers().forEach((player) => {
				if (!this.ResolveIsSyncForPlayer(player, originalPayload.data.atom as never)) return;

				const copyPayload = DeepCloneTable(originalPayload) as { type: "init"; data: { atom: S } };
				const data = this.ResolveSyncForPlayer(player, copyPayload.data.atom as never);
				copyPayload.data.atom = data as never;

				remotes._shared_class_dispatch.fire(player, copyPayload, this.id);
			});
		});

		const hydrate = (player: Player) => {
			if (!this.ResolveIsSyncForPlayer(player, this.atom() as never)) return;

			remotes._shared_class_dispatch.fire(player, { type: "init", data: { atom: this.atom() } }, this.id);
		};

		this.connection = remotes._shared_class_start.connect((player, id) => id === this.id && hydrate(player));
		remotes._shared_class_created_new_instance.fireAll(this.GenerateInfo());
	}

	private _onStartClient() {
		this.receiver = sync.client({
			atoms: { atom: this.atom },
		});

		remotes._shared_class_start.fire(this.id);
	}

	/** Start the function */
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
		this.broadcastConnection?.();
		this.connection?.();

		IsServer && remotes._shared_class_destroy_instance.fireAll(this.id);
	}
}
