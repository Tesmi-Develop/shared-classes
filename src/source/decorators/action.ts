import { rootProducer } from "../../state/rootProducer";
import { Shared } from "../Shared";

/**
 * Decorator for creating an Action inside a shared component.
 */
export const Action = () => {
	return <S extends object, T extends Shared<S>>(
		target: T,
		propertyKey: string,
		descriptor: TypedPropertyDescriptor<(this: T, ...args: unknown[]) => S>,
	) => {
		const originalMethod = descriptor.value;

		descriptor.value = function (this: T, ...args: unknown[]) {
			const result = originalMethod(this, ...args);
			this.Dispatch(result);

			return result;
		};

		return descriptor;
	};
};
