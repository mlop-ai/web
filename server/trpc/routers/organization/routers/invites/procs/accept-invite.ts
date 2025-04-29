import { OrganizationRole } from "@prisma/client";

import { InvitationStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../../../../../lib/trpc";
import { nanoid } from "nanoid";

export const acceptInviteProcedure = protectedProcedure
  .input(z.object({ invitationId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const invitation = await ctx.prisma.invitation.findFirst({
      where: {
        id: input.invitationId,
        email: ctx.user.email,
        status: InvitationStatus.PENDING,
      },
    });

    if (!invitation || invitation.expiresAt < new Date()) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invalid or expired invitation",
      });
    }

    // Create member and update invitation in transaction
    const result = await ctx.prisma.$transaction([
      ctx.prisma.member.create({
        data: {
          id: nanoid(),
          organizationId: invitation.organizationId,
          userId: ctx.user.id,
          role: invitation.role || OrganizationRole.MEMBER,
          createdAt: new Date(),
        },
      }),
      ctx.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED },
      }),
    ]);

    return result[0];
  });
