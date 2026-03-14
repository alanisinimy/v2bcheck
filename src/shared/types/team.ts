// Team-specific types are defined in the feature hook (useTeamMembers)
// This file re-exports common team types for shared usage

export interface TeamMember {
  id: string;
  name: string;
  role: string | null;
}
