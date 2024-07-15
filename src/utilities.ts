import { Reflect } from "@flamework/core";
import { AbstractConstructor, Constructor } from "@flamework/core/out/utility";
import { RunService } from "@rbxts/services";

type GeneratorIdReturning<T extends boolean> = T extends true ? string : number;

interface ConstructorWithIndex extends Constructor {
	__index: object;
}

export const CreateGeneratorId = <C extends boolean = true>(isString = true as C) => {
	const instance = {
		freeId: 0,
		Next: (): GeneratorIdReturning<C> => {
			const id = instance.freeId;
			instance.freeId += 1;
			return (isString ? `${id}` : id) as GeneratorIdReturning<C>;
		},
	};

	return instance as { Next: () => GeneratorIdReturning<C> };
};

const consolePrefix = `SharedClasses`;
const errorString = `--// [${consolePrefix}]: Caught an error in your code //--`;
const warnString = `--// [${consolePrefix}] //--`;

export const IsServer = RunService.IsServer();
export const IsClient = RunService.IsClient();

export function GetConstructorIdentifier(constructor: AbstractConstructor) {
	return (Reflect.getMetadata(constructor, "identifier") as string) ?? "Not found id";
}

export function AddMapArrayElement<K, V extends defined>(map: Map<K, V[]>, key: K, value: V) {
	const array = map.get(key) ?? [];
	array.push(value);
	map.set(key, array);
}

export function AddMapWithMapElement<K, V extends defined, K2>(map: Map<K, Map<K2, V>>, key: K, key2: K2, value: V) {
	const map2 = map.get(key) ?? new Map<K2, V>();
	map2.set(key2, value);
	map.set(key, map2);
	return map2;
}

export function GetInheritanceTree<T>(constructor: AbstractConstructor<T>, parent: Constructor<T>) {
	let currentClass = constructor as unknown as ConstructorWithIndex;
	let metatable = getmetatable(currentClass) as ConstructorWithIndex;
	const tree = [constructor] as Constructor<T>[];

	while (currentClass && metatable.__index !== parent) {
		currentClass = metatable.__index as ConstructorWithIndex;
		metatable = getmetatable(currentClass) as ConstructorWithIndex;
		tree.push(currentClass as unknown as Constructor<T>);
	}

	return tree;
}

export function logError(Message: string, DisplayTraceback = true): never {
	return error(`\n ${errorString} \n ${Message} \n \n ${DisplayTraceback && debug.traceback()}`);
}

export function logWarning(Message: string) {
	warn(`\n ${warnString} \n ${Message} \n`);
}

export function logAssert<T>(condition: T, message: string, DisplayTraceback = true): asserts condition {
	!condition && logError(message, DisplayTraceback);
}

export function DeepCloneTable<V>(value: ReadonlyArray<V>): Array<V>;
export function DeepCloneTable<V>(value: ReadonlySet<V>): Set<V>;
export function DeepCloneTable<K, V>(value: ReadonlyMap<K, V>): Map<K, V>;
export function DeepCloneTable<T extends object>(value: T): T;
export function DeepCloneTable<T extends object>(obj: T): T {
	const result = {};

	for (const [key, value] of pairs(obj)) {
		result[key as never] = typeIs(value, "table") ? (DeepCloneTable(value as never) as never) : (value as never);
	}

	return result as T;
}
