import { IClassProducer, InferClassProducerState, Subscribe } from "@rbxts/reflex-class";
import { IsClient, IsServer } from "../../utilities";

export const SharedSubscribe = <T extends IClassProducer<InferClassProducerState<T>>, R>(
	side: "Server" | "Client" | "Both" = "Client",
	selector: (state: InferClassProducerState<T>) => R,
) => {
	return (
		target: T,
		propertyKey: string,
		descriptor: TypedPropertyDescriptor<(this: T, state?: R, previousState?: R) => void>,
	) => {
		if (side === "Server" && IsClient) return;
		if (side === "Client" && IsServer) return;

		return Subscribe(selector)(target, propertyKey, descriptor);
	};
};
