export type Role = "donor" | "receiver" | "rider" | "coordinator";

export type MarkerKind = "donor" | "receiver" | "rider" | "hub";

export interface RoleDefinition {
  id: Role;
  label: string;
  shortLabel: string;
  description: string;
  detail: string;
  nav: string[];
  initials: string;
}

export interface MapMarker {
  id: string;
  kind: MarkerKind;
  label: string;
  meta: string;
  x: number;
  y: number;
  status: string;
  tone: "yellow" | "blue" | "green" | "red";
}
