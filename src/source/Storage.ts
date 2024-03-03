import { AbstractConstructor, Constructor } from "@flamework/core/out/utility";
import { Shared } from "./Shared";

export namespace Storage {
	export const SharedClasseTrees = new Map<AbstractConstructor<Shared>, AbstractConstructor<Shared>[]>();
	export const SharedClasses = new Map<string, Map<string, unknown[]>>();
	export const SharedClassById = new Map<string, Shared>();
	export const SharedClassRoots = new Map<AbstractConstructor<Shared>, AbstractConstructor<Shared>[]>();
}
