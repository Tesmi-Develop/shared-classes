import { Flamework } from "@flamework/core";
import { BroadcastAction } from "@rbxts/reflex";
import { Client, Server, createRemotes, remote } from "@rbxts/remo";
import { SharedInfo } from "./types";

export const remotes = createRemotes({
	_shared_class_dispatch: remote<Client, [Actions: BroadcastAction[], id: string]>(
		Flamework.createGuard(),
		Flamework.createGuard(),
	),
	_shared_class_start: remote<Server, [id: string]>(Flamework.createGuard()),
	_shared_class_get_all_instances: remote<Server>().returns<SharedInfo[]>(),

	_shared_class_created_new_instance: remote<Client, [info: SharedInfo]>(
		Flamework.createGuard()
	),
	_shared_class_destroy_instance: remote<Client, [id: string]>(Flamework.createGuard()),
});
