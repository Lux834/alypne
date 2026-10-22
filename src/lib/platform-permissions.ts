export const platformPermissions = [
  "platform:read",
  "users:manage",
  "studios:manage",
  "campaigns:manage",
  "submissions:review",
  "support:manage",
] as const;

export type PlatformPermission = (typeof platformPermissions)[number];

export const platformPermissionLabels: Record<PlatformPermission, string> = {
  "platform:read": "View aggregate platform health",
  "users:manage": "Manage user access and suspension",
  "studios:manage": "Manage studio workspaces",
  "campaigns:manage": "Manage campaign status",
  "submissions:review": "Review submissions",
  "support:manage": "Read and respond to support tickets",
};
