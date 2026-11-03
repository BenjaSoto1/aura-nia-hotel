import { db } from "../db";
import type { ToolContext } from "../tools/context";

export type State = Record<string, any>;

/** Estado de la conversación para los flujos guiados (paso actual y datos recogidos). */
export async function getState(ctx: ToolContext): Promise<State> {
  const c = await db.conversation.findUnique({ where: { channel_channelUserId: { channel: ctx.channel, channelUserId: ctx.channelUserId } } });
  try {
    return JSON.parse(c?.stateJson || "{}");
  } catch {
    return {};
  }
}

export async function setState(ctx: ToolContext, state: State) {
  await db.conversation.update({
    where: { channel_channelUserId: { channel: ctx.channel, channelUserId: ctx.channelUserId } },
    data: { stateJson: JSON.stringify(state) },
  });
}
