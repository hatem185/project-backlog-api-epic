import {
  BaseController,
  Controller,
  Delete,
  Get,
  type IRequestContext,
  type IRoute,
  Patch,
  Post,
  Response,
  Versioned,
} from "@Core/common/mod.ts";
import { type RouterContext, Status } from "oak";
import e from "validator";
import { ObjectId } from "mongo";

import { ProjectModel } from "@Models/project.ts";
import checkAuth from "@Middlewares/checkAuth.ts";
import {
  EInvitationStatus,
  EProjectPermission,
  ProjectMemberModel,
} from "@Models/projectMember.ts";

@Controller("/projects/", { name: "projects", middlewares: [checkAuth()] })
export default class ProjectsController extends BaseController {
  @Post("/")
  public create(route: IRoute) {
    // Define Query Schema
    const QuerySchema = e.object({}, { allowUnexpectedProps: true });

    // Define Params Schema
    const ParamsSchema = e.object({});

    // Define Body Schema
    const BodySchema = e.object({
      name: e.string(),
    });

    return new Versioned().add("1.0.0", {
      shape: {
        query: QuerySchema.toSample(),
        params: ParamsSchema.toSample(),
        body: BodySchema.toSample(),
      },
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Query Validation
        // const Query =
        await QuerySchema.validate(
          Object.fromEntries(ctx.router.request.url.searchParams),
          { name: `${route.scope}.query` },
        );

        // Params Validation
        // const Params =
        await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        // Body Validation
        const Body = await BodySchema.validate(
          await ctx.router.request.body({ type: "json" }).value,
          { name: `${route.scope}.body` },
        );
        const { userPayload } = ctx.router.state;
        const project = await ProjectModel.create({
          ...Body,
          owner: userPayload.id,
          // members: [],
        });
        await ProjectMemberModel.create({
          projectId: project._id,
          invitedById: project.owner,
          userId: project.owner,
          invitationStatus: EInvitationStatus.ACCEPTED,
          permission: EProjectPermission.ROOT,
        });
        return Response.statusCode(Status.Created).data(project);
      },
    });
  }

  @Patch("/:id/", {
    middlewares: [],
  })
  public update(route: IRoute) {
    // Define Query Schema
    const QuerySchema = e.object({}, { allowUnexpectedProps: true });

    // Define Params Schema
    const ParamsSchema = e.object({
      id: e.string(),
    });

    // Define Body Schema
    const BodySchema = e.object({
      name: e.string(),
    });

    return new Versioned().add("1.0.0", {
      shape: {
        query: QuerySchema.toSample(),
        params: ParamsSchema.toSample(),
        body: BodySchema.toSample(),
      },
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Query Validation
        // const Query =
        await QuerySchema.validate(
          Object.fromEntries(ctx.router.request.url.searchParams),
          { name: `${route.scope}.query` },
        );

        /**
         * It is recommended to keep the following validators in place even if you don't want to validate any data.
         * It will prevent the client from injecting unexpected data into the request.
         */

        // Params Validation
        const Params = await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        // Body Validation
        const Body = await BodySchema.validate(
          await ctx.router.request.body({ type: "json" }).value,
          { name: `${route.scope}.body` },
        );

        const { modifications } = await ProjectModel.updateOneOrFail(
          Params.id,
          Body,
        );

        return Response.data(modifications);
      },
    });
  }

  @Get("/:id?/")
  public get(route: IRoute) {
    const CurrentTimestamp = Date.now();

    // Define Query Schema
    const QuerySchema = e.object(
      {
        search: e.optional(e.string()),
        range: e.optional(
          e.tuple([e.date().end(CurrentTimestamp), e.date()], { cast: true }),
        ),
        offset: e.optional(e.number({ cast: true }).min(0)).default(0),
        limit: e.optional(e.number({ cast: true }).max(2000)).default(2000),
        sort: e
          .optional(
            e.record(e.number({ cast: true }).min(-1).max(1), { cast: true }),
          )
          .default({ _id: -1 }),
        project: e.optional(
          e.record(e.number({ cast: true }).min(0).max(1), { cast: true }),
        ),
        includeTotalCount: e.optional(
          e
            .boolean({ cast: true })
            .describe(
              "If `true` is passed, the system will return a total items count for pagination purpose.",
            ),
        ),
      },
      { allowUnexpectedProps: true },
    );

    // Define Params Schema
    const ParamsSchema = e.object({
      id: e.optional(e.string()),
    });

    return Versioned.add("1.0.0", {
      shape: {
        query: QuerySchema.toSample(),
        params: ParamsSchema.toSample(),
      },
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Query Validation
        const Query = await QuerySchema.validate(
          Object.fromEntries(ctx.router.request.url.searchParams),
          { name: `${route.scope}.query` },
        );

        /**
         * It is recommended to keep the following validators in place even if you don't want to validate any data.
         * It will prevent the client from injecting unexpected data into the request.
         */

        // Params Validation
        const Params = await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        const ProjectsBaseFilters = {
          ...(Query.range instanceof Array
            ? {
              createdAt: {
                $gt: new Date(Query.range[0]),
                $lt: new Date(Query.range[1]),
              },
            }
            : {}),
        };

        const userPayload = ctx.router.state.userPayload;
        const projectMember = await ProjectMemberModel.find({
          userId: new ObjectId(userPayload.id as string),
          invitationStatus: EInvitationStatus.ACCEPTED,
        }).project({
          projectId: 1,
          _id: 1,
        });
        const projectIds = projectMember.map(({ projectId }) => projectId);
        const ProjectsListQuery = ProjectModel.search(Query.search)
          .filter({
            ...(Params.id
              ? { _id: new ObjectId(Params.id) }
              : { _id: { $in: projectIds } }),
            // owner: ,
            ...ProjectsBaseFilters,
          })
          .skip(Query.offset)
          .limit(Query.limit)
          .sort(Query.sort);

        if (Query.project) ProjectsListQuery.project(Query.project);

        return Response.data({
          totalCount: Query.includeTotalCount
            //? Make sure to pass any limiting conditions for count if needed.
            ? await ProjectModel.count(ProjectsBaseFilters)
            : undefined,
          results: await ProjectsListQuery,
        });
      },
    });
  }

  @Delete("/:id/")
  public delete(route: IRoute) {
    // Define Params Schema
    const ParamsSchema = e.object({
      id: e.string(),
    });

    return Versioned.add("1.0.0", {
      shape: {
        params: ParamsSchema.toSample(),
      },
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Params Validation
        const Params = await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        await ProjectModel.deleteOneOrFail(Params.id);

        return Response.true();
      },
    });
  }
}
