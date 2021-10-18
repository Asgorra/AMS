import { Component, Components } from "@flamework/components";
import { Dependency } from "@flamework/core";
import { Janitor } from "@rbxts/janitor";
import { Action } from "server/modules/Action";
import { playAnim } from "server/modules/AnimPlayer";
import { GenerateMiddleware, RunMiddleware } from "server/modules/Middleware";
import Config from "shared/Config";
import { CharacterLimb } from "shared/Types";
import { EndOfLineState } from "typescript";
import { Essential } from "./Essential";
import { ToolAttributes, ToolInstance } from "./Tool";
import { AddHitMiddleware, Weapon } from "./Weapon";

let Added = false;

interface ShieldInstance extends ToolInstance {}

@Component({
	tag: "Shield",
	defaults: {
		BUTTON_TOGGLE: "Two",
	},
})
export class Shield extends Essential<ToolAttributes, ShieldInstance> {
	EnableAnimation = Config.Animations.Shield.Equip;
	DisableAnimation = Config.Animations.Shield.Holster;

	EnabledLimb = "LeftUpperArm" as CharacterLimb;
	DisabledLimb = "UpperTorso" as CharacterLimb;

	constructor() {
		super();
		this.InputInfo.Enabled.Begin = {
			MouseButton2: {
				Action: "Block",
			},
		};

		this.InputInfo.Blocking = {
			End: {
				MouseButton2: {
					Action: "EndBlock",
				},
			},
		};

		this.Actions.Block = new Action((End, janitor) => this.Block(End, janitor));
		this.Actions.EndBlock = new Action((End) => this.EndBlock(End));
	}

	private Block(End: Callback, janitor: Janitor) {
		this.setState("Blocking");
		const AnimTrack = playAnim(this.Player, Config.Animations.Shield.Block);
		janitor.Add(() => {
			AnimTrack.Stop();
		});
	}

	private EndBlock(End: Callback) {
		this.setState("Enabled");
		this.Actions.Block.End();
		End();
	}

	Init() {
		const BodyAttach = this.instance.BodyAttach;
		const Blocker = new Instance("Part");
		Blocker.Name = "Blocker";
		Blocker.Transparency = 1;
		Blocker.CanCollide = false;
		Blocker.CanTouch = true;
		Blocker.Anchored = false;
		Blocker.Position = BodyAttach.Position;
		Blocker.Size = Config.Attributes.ShieldHitboxSize;

		const Weld = new Instance("Weld");
		Weld.Name = "Blocker";
		Weld.Parent = BodyAttach;
		Weld.Part0 = BodyAttach;
		Weld.Part1 = Blocker;

		Blocker.Parent = BodyAttach.Parent;
	}

	PlayerInit() {}
}

const components = Dependency<Components>();

const [BlockedMiddleware, AddBlockedMiddleware] = GenerateMiddleware<[Weapon, Shield]>();
export { AddBlockedMiddleware };

if (!Added) {
	Added = true;

	AddHitMiddleware((stop, weapon, hit, db) => {
		if (hit.Name === "Blocker") {
			const Shield = components.getComponent<Shield>(hit.Parent as Model);

			if (Shield.Player === weapon.Player) {
				return;
			}
			const Player = Shield.Player;
			if (!Player) {
				error();
			}
			if (db.get(Player)) {
				return; // the player was already hit by the sword so he shouldn't be able to block it
			}
			db.set(Player, true);

			RunMiddleware(BlockedMiddleware, weapon, Shield);

			weapon.Actions.Release.End();
			weapon.ActiveAnimation?.Stop(0.2);
			stop(`${Player.Name}'s shield blocked ${weapon.Player?.Name}'s swing`);
		}
	});
}