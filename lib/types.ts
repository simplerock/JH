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
  owner: string | null;
};

export type Task = {
  id: string;
  title: string;
  area: string | null;
  recurrence: Recurrence;
  assignee: string | null;
  goal_id: string | null;
  project_id: string | null;
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

export type ProjectStatus = "idea" | "planned" | "ongoing" | "done";

export type Project = {
  id: string;
  title: string;
  status: ProjectStatus;
  budget: number | null;
  spent: number;
  owner: string | null;
  notes: string | null;
};

export type MaintenanceItem = {
  id: string;
  title: string;
  interval_days: number;
  last_done: string | null;
  owner: string | null;
  notes: string | null;
};

export type BudgetCategory = { id: string; name: string; monthly_limit: number };

export type Transaction = { id: string; category_id: string | null; amount: number; occurred_on: string; note: string | null };
