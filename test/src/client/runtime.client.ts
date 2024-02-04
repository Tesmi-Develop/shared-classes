import { ValueStorage } from "shared/testShared";
import { SharedClasses } from "../source/Core";
import { Subscribe } from "../source/decorators";
import { SharedClass } from "../source/decorators/sharedClass";
import("shared/testShared").expect();

@SharedClass()
class ClientStorage extends ValueStorage {
	@Subscribe((state) => state.Value)
	private a(val: number) {
		print(`client ${val}`);
	}

	protected onStart() {}
}

SharedClasses.AttachDevToolMiddleware();
SharedClasses.StartClient();
