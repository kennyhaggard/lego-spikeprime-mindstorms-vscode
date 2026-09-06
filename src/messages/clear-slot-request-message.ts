import { BaseMessage } from "./base-message";

export class ClearSlotRequestMessage extends BaseMessage {
    public static readonly Id = 0x46;

    constructor(public readonly slot: number) {
        super();
    }

    public serialize(): Uint8Array {
        return new Uint8Array([ClearSlotRequestMessage.Id, this.slot]);
    }
}