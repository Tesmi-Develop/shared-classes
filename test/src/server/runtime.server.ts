import { ValueStorage } from "shared/testShared";
import { Action } from "@rbxts/reflex-class";
import { SharedClass } from "../source/decorators";
const expect = import("shared/testShared").expect();

@SharedClass()
class ServerStorage extends ValueStorage {
	protected onStart(): void {
		task.spawn(() => {
			// eslint-disable-next-line no-constant-condition
			let k = 0;
			// eslint-disable-next-line no-constant-condition
			while (true) {
				task.wait(1);
				this.increment();
				k++;
			}
			//this.Destroy();
		});
	}

	protected onDestroy(): void {
		print("destroyed");
	}

	@Action()
	private increment() {
		return {
			...this.state,
			Value: this.state.Value + 1,
		};
	}
}

new ServerStorage().Start();
