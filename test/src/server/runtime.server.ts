import { ValueStorage } from "shared/testShared";
import { SharedClasses } from "../source/Core";
import { SharedClass } from "../source/decorators/sharedClass";
import { Action } from "../source/decorators";
const expect = import("shared/testShared").expect();

@SharedClass()
class ServerStorage extends ValueStorage {
	protected onStart(): void {
		task.spawn(() => {
			// eslint-disable-next-line no-constant-condition
			while (true) {
				task.wait(1);
				this.increment();
			}
		});
	}

	@Action()
	private increment() {
		return {
			...this.state,
			Value: this.state.Value + 1,
		};
	}
}

SharedClasses.StartServer();

new ServerStorage().Start();
