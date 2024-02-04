import { Constructor, SharedId } from "../types";
import { Shared } from "./Shared";

export namespace Storage {
	export const SharedClasses = new Map<string, Constructor<Shared<object>>>();
	export const SharedInstances = new Map<Shared<object>, SharedId>();
	export const SharedClassesId = new Map<Constructor<Shared<object>>, SharedId>();
	export const SharedClassLinks = new Map<Constructor<Shared<object>>, Constructor<Shared<object>>>();
}
