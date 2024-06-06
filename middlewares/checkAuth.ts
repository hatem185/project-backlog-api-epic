import e from "validator";
import { type RouterContext } from "oak";
import { verify } from "djwt";
import { Key } from "@Models/user.ts";

// If this is a global middleware, do not add arguments to the factory function.
export default () =>
async (ctx: RouterContext<string>, next: () => Promise<unknown>) => {
  // Query Validation (You can remove this validation if not required)
  try {
    // const Query =
    await e
      .object({}, { allowUnexpectedProps: true })
      .validate(Object.fromEntries(ctx.request.url.searchParams), {
        name: "query",
      });
    // Continue to next middleware
    const authorization = ctx.request.headers.get("authorization") ?? undefined;
    console.log(authorization);
    if (
      !authorization ||
      authorization.length === 0 ||
      !authorization.startsWith("Bearer")
    ) {
      throw new Error(`Invalid authorization header.`);
    }
    const [_, token] = authorization.split(" ");
    const userPayload = await verify(token, Key);
    ctx.state["userPayload"] = userPayload;
    await next();
  } catch (e) {
    console.log(typeof e);
    console.log(e);
    throw e;
  }
};
