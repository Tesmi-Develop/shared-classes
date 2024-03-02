import { Constructor } from "@flamework/core/out/utility";
import { GetConstructorIdentifier } from "../utilities";
import type { Shared } from "./Shared";
export class Pointer {
	private static pointers = new Map<string, Pointer>();
	private static pointerID = new Map<Pointer, string>();
	private componentMetadata?: string;

	public static GetPointer = (id: string) => {
		return Pointer.pointers.get(id);
	};

	public static GetPointerID = (pointer: Pointer) => {
		return Pointer.pointerID.get(pointer);
	};

	public static Create(id: string) {
		assert(!Pointer.pointers.has(id), `Pointer with name ${id} already exists`);
		const newPointer = new Pointer();
		Pointer.pointers.set(id, newPointer);
		Pointer.pointerID.set(newPointer, id);

		return newPointer;
	}

	private getConstructor(component: Shared | Constructor<Shared>) {
		const constructor = getmetatable(component) as typeof Shared;
		return component instanceof constructor ? (getmetatable(component) as Constructor<Shared>) : component;
	}

	public AddComponent(component: Shared | Constructor<Shared>) {
		const constructor = this.getConstructor(component);
		const identifier = GetConstructorIdentifier(constructor);

		if (this.componentMetadata === identifier) return;
		assert(!this.componentMetadata, "Pointer already has a component");

		this.componentMetadata = identifier;
	}

	public RemoveComponent() {
		this.componentMetadata = undefined;
	}

	public GetComponentMetadata() {
		assert(this.componentMetadata, "Pointer has no component");
		return this.componentMetadata;
	}
}

export const CreatePointer = (id: string) => {
	return Pointer.Create(id);
};
