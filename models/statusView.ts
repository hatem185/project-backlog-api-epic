import e, { inferInput, inferOutput } from "validator";
import { InputDocument, Mongo, ObjectId, OutputDocument } from "mongo";

export const StatusViewSchema = () =>
  e.object({
    _id: e.optional(e.instanceOf(ObjectId, { instantiate: true })),
    name: e.string(),
    projectId: e.instanceOf(ObjectId, { instantiate: true }),
    createdById: e.instanceOf(ObjectId, { instantiate: true }),
    color: e.optional(e.string()),
    createdAt: e.optional(e.date()).default(() => new Date()),
    updatedAt: e.optional(e.date()).default(() => new Date()),
  });

export type TStatusViewInput = InputDocument<
  inferInput<typeof StatusViewSchema>
>;
export type TStatusViewOutput = OutputDocument<
  inferOutput<typeof StatusViewSchema>
>;

export const StatusViewModel = Mongo.model("statusView", StatusViewSchema);

StatusViewModel.pre("update", (details) => {
  details.updates.$set = {
    ...details.updates.$set,
    updatedAt: new Date(),
  };
});
