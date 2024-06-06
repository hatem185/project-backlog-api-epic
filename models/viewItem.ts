import e, { inferInput, inferOutput } from "validator";
import { InputDocument, Mongo, ObjectId, OutputDocument } from "mongo";
export enum EPriorityStatus {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  DEFAULT = "default",
}
export const ViewItemSchema = () =>
  e.object({
    _id: e.optional(e.instanceOf(ObjectId, { instantiate: true })),
    title: e.string(),
    description: e.optional(e.string()),
    statusViewId: e.instanceOf(ObjectId, { instantiate: true }),
    projectId: e.instanceOf(ObjectId, { instantiate: true }),
    createdBy: e.instanceOf(ObjectId, { instantiate: true }),
    priority: e
      .optional(e.enum(Object.values(EPriorityStatus)))
      .default(EPriorityStatus.DEFAULT),
    createdAt: e.optional(e.date()).default(() => new Date()),
    updatedAt: e.optional(e.date()).default(() => new Date()),
  });

export type TViewItemInput = InputDocument<inferInput<typeof ViewItemSchema>>;
export type TViewItemOutput = OutputDocument<
  inferOutput<typeof ViewItemSchema>
>;

export const ViewItemModel = Mongo.model("viewItem", ViewItemSchema);

ViewItemModel.pre("update", (details) => {
  details.updates.$set = {
    ...details.updates.$set,
    updatedAt: new Date(),
  };
});
