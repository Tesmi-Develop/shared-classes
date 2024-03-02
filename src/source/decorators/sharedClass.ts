import { Constructor } from "@flamework/core/out/utility";
import { SharedClasses } from "../Core";
import { Shared } from "../Shared";

export const SharedClass = () => {
	return <T extends Shared>(classConstructor: Constructor<T>) => {
		SharedClasses.RegisterySharedConstructor(classConstructor);
	};
};
