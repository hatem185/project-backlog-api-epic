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

import { StatusViewModel } from "@Models/statusView.ts";
import {
  EProjectPermission,
  TProjectMemberOutput,
} from "@Models/projectMember.ts";
import checkActorProjectMembership from "@Middlewares/checkActorProjectMembership.ts";
import checkAuth from "@Middlewares/checkAuth.ts";

@Controller("/project/status/view/", {
  name: "projectStatusView",
  middlewares: [checkAuth()],
})
export default class ProjectStatusViewController extends BaseController {
  static checkPermission(actorMembership: TProjectMemberOutput) {
    if (actorMembership.permission === EProjectPermission.VIEW_ONLY) {
      throw new Error("View Only Permission.");
    }
  }
  @Post("/:projectId", { middlewares: [checkActorProjectMembership()] })
  public create(route: IRoute) {
    // Define Query Schema
    const QuerySchema = e.object({}, { allowUnexpectedProps: true });

    // Define Params Schema
    const ParamsSchema = e.object({ projectId: e.string() });

    // Define Body Schema
    const BodySchema = e.object({
      name: e.string(),
      color: e.optional(e.string()),
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
        const actorMembership = ctx.router.state
          .actorMembership as TProjectMemberOutput;
        ProjectStatusViewController.checkPermission(actorMembership);
        return Response.statusCode(Status.Created).data(
          await StatusViewModel.create({
            projectId: Params.projectId,
            createdById: actorMembership.userId,
            ...Body,
          }),
          // {}
        );
      },
    });
  }

  @Patch("/:projectId/:id/", { middlewares: [checkActorProjectMembership()] })
  public update(route: IRoute) {
    // Define Query Schema
    const QuerySchema = e.object({}, { allowUnexpectedProps: true });

    // Define Params Schema
    const ParamsSchema = e.object({
      id: e.string(),
      projectId: e.string(),
    });

    // Define Body Schema
    const BodySchema = e.object({
      name: e.optional(e.string()),
      color: e.optional(e.string()),
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
        const Params = await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        // Body Validation
        const Body = await BodySchema.validate(
          await ctx.router.request.body({ type: "json" }).value,
          { name: `${route.scope}.body` },
        );

        const actorMembership = ctx.router.state
          .actorMembership as TProjectMemberOutput;
        ProjectStatusViewController.checkPermission(actorMembership);

        const { modifications } = await StatusViewModel.updateOneOrFail(
          Params.id,
          Body,
        );

        return Response.data(modifications);
      },
    });
  }

  @Get("/:projectId/:id?/", { middlewares: [checkActorProjectMembership()] })
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
      projectId: e.string(),
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

        // Params Validation
        const Params = await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        const StatusViewsBaseFilters = {
          ...(Query.range instanceof Array
            ? {
              createdAt: {
                $gt: new Date(Query.range[0]),
                $lt: new Date(Query.range[1]),
              },
            }
            : {}),
        };

        const StatusViewsListQuery = StatusViewModel.search(Query.search)
          .filter({
            ...(Params.id ? { _id: new ObjectId(Params.id) } : {}),
            ...(!Params.id
              ? { projectId: new ObjectId(Params.projectId) }
              : {}),
            ...StatusViewsBaseFilters,
          })
          .skip(Query.offset)
          .limit(Query.limit)
          .sort(Query.sort);

        if (Query.project) StatusViewsListQuery.project(Query.project);

        return Response.data({
          totalCount: Query.includeTotalCount
            //? Make sure to pass any limiting conditions for count if needed.
            ? await StatusViewModel.count(StatusViewsBaseFilters)
            : undefined,
          results: await StatusViewsListQuery,
        });
      },
    });
  }

  @Delete("/:projectId/:id/", { middlewares: [checkActorProjectMembership()] })
  public delete(route: IRoute) {
    // Define Params Schema
    const ParamsSchema = e.object({
      id: e.string(),
      projectId: e.string(),
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

        const actorMembership = ctx.router.state
          .actorMembership as TProjectMemberOutput;
        ProjectStatusViewController.checkPermission(actorMembership);

        await StatusViewModel.deleteOneOrFail(Params.id);

        return Response.true();
      },
    });
  }
}
