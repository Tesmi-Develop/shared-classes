import { Modding } from "@flamework/core";
import { remotes } from "../remotes";
import { SharedInfo } from "../types";
import {
	AddMapArrayElement,
	AddMapWithMapElement,
	GetConstructorIdentifier,
	GetInheritanceTree,
	IsClient,
	IsServer,
	logAssert,
	logWarning,
} from "../utilities";
import { Shared } from "./Shared";
import { Storage } from "./Storage";
import { AbstractConstructor, Constructor, isConstructor } from "@flamework/core/out/utility";
import { Pointer } from "./pointer";

if (IsServer) {
	remotes._shared_class_get_all_instances.onRequest((player) => {
		const result = [] as SharedInfo[];
		Storage.SharedClassById.forEach((v) => result.push(v.GenerateInfo()));
		return result;
	});
}

export namespace SharedClasses {
	let isStarterClient = false;

	export const RegisterySharedConstructor = (constructor: AbstractConstructor<Shared>) => {
		const tree = GetInheritanceTree<Shared>(constructor, Shared as Constructor<Shared>);
		const root = tree[tree.size() - 1];
		Storage.SharedClasseTrees.set(constructor, tree);

		if (root !== constructor) {
			AddMapArrayElement(Storage.SharedClassRoots, root, constructor);
		}

		if (IsClient) return;
		tree.forEach((ctr) => {
			modifySharedConstructor(ctr);
		});
	};

	export const StartClient = async () => {
		logAssert(IsClient, "StartClient can only be used on the client");

		if (isStarterClient) return;
		isStarterClient = true;

		remotes._shared_class_dispatch.connect((actions, id) => {
			Storage.SharedClassById.get(id)?.__DispatchFromServer(actions);
		});

		const shareds = await remotes._shared_class_get_all_instances();

		shareds.forEach((info) => {
			const instance = createSharedInstance(info);
			instance?.__SetId(info.Id);
			instance?.Start();
		});

		remotes._shared_class_created_new_instance.connect((info) => {
			const instance = createSharedInstance(info);
			instance?.__SetId(info.Id);
			instance?.Start();
		});

		remotes._shared_class_destroy_instance.connect((id) => {
			Storage.SharedClassById.get(id)?.Destroy();
			Storage.SharedClassById.delete(id);
		});
	};

	export const GetSharedInstanceFromId = (id: string) => {
		return Storage.SharedClassById.get(id);
	};

	const createSharedInstance = ({ SharedIdentifier, Identifier, PointerID, Id, Arguments }: SharedInfo) => {
		if (!Modding.getObjectFromId(SharedIdentifier)) {
			logWarning(
				`Attempt to create shared, but shared class does not exist\n SharedIdentifier: ${SharedIdentifier}`,
			);
			return;
		}

		const FindArguments = (tree: AbstractConstructor<Shared>[]) => {
			let args = undefined as unknown[] | undefined;

			tree?.forEach((value) => {
				if (!Arguments.has(GetConstructorIdentifier(value))) return;
				args = Arguments.get(GetConstructorIdentifier(value));
			});

			return args;
		};

		// Try get component from pointer
		if (PointerID) {
			const pointer = Pointer.GetPointer(PointerID);

			if (!pointer) {
				logWarning(`Attempt to dispatch component with missing pointer\n PointerID: ${PointerID}`);
				return;
			}

			try {
				const ctr = Modding.getObjectFromId(pointer.GetComponentMetadata()) as Constructor<Shared>;

				const tree = Storage.SharedClasseTrees.get(ctr);
				assert(tree, `Shared class ${ctr} is not decorated`);
				const args = FindArguments(tree);

				assert(args, `Shared class ${pointer.GetComponentMetadata()} is not registery on server`);

				return new ctr(...(args as never[]));
			} catch (error) {
				logWarning(`${error}\n PointerID: ${PointerID}`);
			}

			return;
		}

		// Try get component from indentifier
		const ctr = Modding.getObjectFromId(Identifier) as Constructor<Shared>;
		let args = Arguments.get(Identifier);
		if (ctr) {
			return new ctr(...(args as never[]));
		}

		// Try get component from shared identifier
		const sharedClasses = Storage.SharedClassRoots.get(
			Modding.getObjectFromId(SharedIdentifier) as Constructor<Shared>,
		);
		assert(sharedClasses, `Shared class ${SharedIdentifier} is not registery`);

		if (sharedClasses.size() > 1) {
			logWarning(
				`Attempt to allow dispatching when an instance has multiple sharedComponent\n Instance: ${Instance}\n SharedIdentifier: ${SharedIdentifier}\n ServerIdentifier: ${Identifier}`,
			);
			return;
		}
		const foundClass = sharedClasses[0];
		args = FindArguments(Storage.SharedClasseTrees.get(sharedClasses[0])!);

		if (isConstructor(foundClass)) {
			return new (foundClass as Constructor<Shared>)(...(args as never[]));
		}
	};

	const modifySharedConstructor = (constructor: Constructor<Shared<object>>) => {
		const typedConstructor = constructor as unknown as { constructor: (...args: unknown[]) => void };
		const originalConstructor = typedConstructor.constructor;

		typedConstructor.constructor = function (this, ...args) {
			const result = originalConstructor(this, ...args);
			const id = GetConstructorIdentifier(constructor);
			const typedInstance = this as unknown as Shared<object>;
			assert(id, `Shared class ${constructor} is not registery`);

			AddMapWithMapElement(Storage.SharedClasses, typedInstance.GetId(), id, args);

			return result;
		};
	};
}
