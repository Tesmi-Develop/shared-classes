/* eslint-disable @typescript-eslint/no-explicit-any */
import { AbstractConstructor } from "@flamework/core/out/utility";
import { SharedClasses } from "../Core";
import { Shared } from "../Shared";

/** @metadata reflect identifier */
export const SharedClass = () => {
	return <T extends Shared<any>>(classConstructor: AbstractConstructor<T>) => {
		SharedClasses.RegisterySharedConstructor(classConstructor);
	};
};
