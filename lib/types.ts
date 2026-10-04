export type Role = "parent" | "child";
export type Recurrence = "none" | "daily" | "weekly" | "monthly";

export type Profile = {
  id: string;
  family_id: string;
  display_name: string;
  role: Role;
  username: string | null;
  color: string;
};

export type Family = { id: string; name: string; invite_code: string };

export type Goal = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  kind: "tasks" | "amount";
  target: number | null;
  current: number;
  unit: string;
  due_date: string | null;
  archived: boolean;
};

export type Task = {
  id: string;
  title: string;
  area: string | null;
  recurrence: Recurrence;
  assignee: string | null;
  goal_id: string | null;
  due_date: string | null;
  points: number;
};

export type Completion = { task_id: string; period: string; completed_by: string };

export type ChecklistItem = { text: string; done: boolean };

export type FamilyEvent = {
  id: string;
  kind: "vacation" | "event" | "activity";
  title: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  notes: string | null;
  checklist: ChecklistItem[];
  goal_id: string | null;
};
