import { AbstractConstructor } from "@flamework/core/out/utility";
import { SharedClasses } from "../Core";
import { Shared } from "../Shared";

/** @metadata reflect identifier */
export const SharedClass = () => {
	return <T extends Shared>(classConstructor: AbstractConstructor<T>) => {
		SharedClasses.RegisterySharedConstructor(classConstructor);
	};
};
