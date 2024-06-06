import e, { inferInput, inferOutput } from "validator";
import { InputDocument, Mongo, ObjectId, OutputDocument } from "mongo";

export const InviteSchema = () =>
  e.object({
    _id: e.optional(e.instanceOf(ObjectId, { instantiate: true })),
    createdAt: e.optional(e.date()).default(() => new Date()),
    updatedAt: e.optional(e.date()).default(() => new Date()),
  });

export type TInviteInput = InputDocument<
  inferInput<typeof InviteSchema>
>;
export type TInviteOutput = OutputDocument<
  inferOutput<typeof InviteSchema>
>;

export const InviteModel = Mongo.model(
  "invite",
  InviteSchema,
);

InviteModel.pre("update", (details) => {
  details.updates.$set = {
    ...details.updates.$set,
    updatedAt: new Date(),
  };
});
