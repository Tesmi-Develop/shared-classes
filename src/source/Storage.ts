/* eslint-disable @typescript-eslint/no-explicit-any */
import { AbstractConstructor } from "@flamework/core/out/utility";
import { Shared } from "./Shared";

export namespace Storage {
	export const SharedClasseTrees = new Map<AbstractConstructor<Shared<any>>, AbstractConstructor<Shared<any>>[]>();
	export const SharedClasses = new Map<string, Map<string, unknown[]>>();
	export const SharedClassById = new Map<string, Shared<any>>();
	export const SharedClassRoots = new Map<AbstractConstructor<Shared<any>>, AbstractConstructor<Shared<any>>[]>();
}
