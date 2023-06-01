import { prisma } from "~/db.server";

export async function getTeamMembersAndInvites({
  userId,
  slug,
}: {
  userId: string;
  slug: string;
}) {
  const org = await prisma.organization.findFirst({
    where: { slug, members: { some: { userId } } },
    select: {
      members: {
        select: {
          id: true,
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
      invites: {
        select: {
          id: true,
          email: true,
          createdAt: true,
          inviter: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!org) {
    return null;
  }

  return { members: org.members, invites: org.invites };
}

export async function removeTeamMember({
  userId,
  slug,
  memberId,
}: {
  userId: string;
  slug: string;
  memberId: string;
}) {
  const org = await prisma.organization.findFirst({
    where: { slug, members: { some: { userId } } },
  });

  if (!org) {
    throw new Error("User does not have access to this organization");
  }

  return prisma.orgMember.delete({
    where: {
      id: memberId,
    },
    include: {
      organization: true,
      user: true,
    },
  });
}

export async function inviteMembers({
  slug,
  emails,
  userId,
}: {
  slug: string;
  emails: string[];
  userId: string;
}) {
  const org = await prisma.organization.findFirst({
    where: { slug, members: { some: { userId } } },
  });

  if (!org) {
    throw new Error("User does not have access to this organization");
  }

  const created = await prisma.orgMemberInvite.createMany({
    data: emails.map((email) => ({
      email,
      organizationId: org.id,
      inviterId: userId,
    })),
    skipDuplicates: true,
  });

  return await prisma.orgMemberInvite.findMany({
    where: {
      organizationId: org.id,
      inviterId: userId,
      email: {
        in: emails,
      },
    },
    include: {
      organization: true,
      inviter: true,
    },
  });
}

export async function getInviteFromToken({ token }: { token: string }) {
  return await prisma.orgMemberInvite.findFirst({
    where: {
      token,
    },
    include: {
      organization: true,
      inviter: true,
    },
  });
}