import { ValueStorage } from "shared/testShared";
import { SharedClasses } from "../source/Core";
import { SharedClass } from "../source/decorators/sharedClass";
import { Subscribe } from "@rbxts/reflex-class";
import("shared/testShared").expect();

@SharedClass()
class ClientStorage extends ValueStorage {
	@Subscribe((state) => state.Value)
	private a(val: number) {
		print(`client ${val}`);
	}
	protected onStart() {
		this.AttachDevTool();
	}
}

SharedClasses.StartClient();
