import { z } from "zod";
import { protectedOrgProcedure } from "../../../../lib/trpc";
import { sqidEncode } from "../../../../lib/sqid";

export const listRunsProcedure = protectedOrgProcedure
  .input(
    z.object({
      projectName: z.string(),
      limit: z.number().min(1).max(100).default(10),
      cursor: z.number().optional(),
      direction: z.enum(["asc", "desc"]).default("desc"),
    })
  )
  .query(async ({ ctx, input }) => {
    console.log(input);
    const runs = await ctx.prisma.runs.findMany({
      include: {
        logs: true,
      },
      where: {
        project: {
          name: input.projectName,
        },
        organizationId: input.organizationId,
      },
      orderBy: {
        createdAt: input.direction,
      },
      take: input.limit,
      cursor: input.cursor ? { id: input.cursor } : undefined,
    });

    const nextCursor =
      runs.length === input.limit ? runs[runs.length - 1].id : null;

    // for all the runs, encode the id and return the runs with the encoded id
    const encodedRuns = runs.map((run) => ({
      ...run,
      id: sqidEncode(run.id),
    }));

    return {
      runs: encodedRuns,
      nextCursor,
    };
  });
