import { InvitationStatus, OrganizationRole } from "@prisma/client";
import { nanoid } from "nanoid";
import { z } from "zod";
import { protectedOrgProcedure } from "../../../../../../lib/trpc";
import { TRPCError } from "@trpc/server";

export const createInviteProcedure = protectedOrgProcedure
  .input(
    z.object({
      organizationId: z.string(),
      email: z.string().email(),
      role: z.nativeEnum(OrganizationRole),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Check if invitation already exists
    const existingInvitation = await ctx.prisma.invitation.findFirst({
      where: {
        organizationId: input.organizationId,
        email: input.email,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "An invitation for this email already exists",
      });
    }

    const invitation = await ctx.prisma.invitation.create({
      data: {
        id: nanoid(),
        organizationId: input.organizationId,
        email: input.email,
        role: input.role,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        inviterId: ctx.user.id,
      },
    });

    // Mock email sending
    console.log(`Mock: Sending invitation email to ${input.email}`);

    return invitation;
  });
