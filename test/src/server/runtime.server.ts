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
			let k = 0;
			while (k < 2) {
				task.wait(10);
				this.increment();
				k++;
			}
			this.Destroy();
		});
	}

	protected onDestroy(): void {
		print("destroyed", this.GetFullId());
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

task.wait(5);
new ServerStorage().Start();
