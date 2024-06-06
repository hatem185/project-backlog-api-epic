import e, { inferInput, inferOutput } from "validator";
import { InputDocument, Mongo, ObjectId, OutputDocument } from "mongo";

export const ProjectSchema = () =>
  e.object({
    _id: e.optional(e.instanceOf(ObjectId, { instantiate: true })),
    name: e.string(),
    owner: e.instanceOf(ObjectId, { instantiate: true }),
    createdAt: e.optional(e.date()).default(() => new Date()),
    updatedAt: e.optional(e.date()).default(() => new Date()),
  });

export type TProjectInput = InputDocument<inferInput<typeof ProjectSchema>>;
export type TProjectOutput = OutputDocument<inferOutput<typeof ProjectSchema>>;

export const ProjectModel = Mongo.model("project", ProjectSchema);

ProjectModel.pre("update", (details) => {
  details.updates.$set = {
    ...details.updates.$set,
    updatedAt: new Date(),
  };
});
