import { AbstractConstructor, Constructor } from "@flamework/core/out/utility";
import { SharedClasses } from "../Core";
import { Shared } from "../Shared";

export const SharedClass = () => {
	return <T extends Shared>(classConstructor: AbstractConstructor<T>) => {
		SharedClasses.RegisterySharedConstructor(classConstructor);
	};
};
