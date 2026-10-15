export type UserRole = 'admin' | 'employee';

export interface User {
  id: string;
  name: string;
  employeeKey: string;
  role: UserRole;
  department: string;
  maxWeeklyHours: number;
  preferences: string[]; // Ordered: [Pref 1, Pref 2, Pref 3]
}

export interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  breakDuration: number; // minutes
  color: string;
  department: string;
}

export interface Assignment {
  id: string;
  userId: string;
  shiftId: string;
  date: string; // YYYY-MM-DD
  status: 'assigned' | 'swapped';
  notes?: string;
}

export interface SwapRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  assignmentId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export type SkillProficiency = 'Beginner' | 'Intermediate' | 'Advanced';

export interface EmployeeSkill {
  id: string;
  userId: string;
  profileId?: string;
  skillName: string;
  proficiency: SkillProficiency;
  yearsOfExperience?: number;
  domain?: string;
  isCustom?: boolean;
  createdAt?: string;
}

export interface EmployeeSkillProfile {
  id: string;
  userId: string;
  domain: string;
  customDomain?: string;
  isBeginner: boolean;
  targetRole?: string;
  updatedAt: string;
  skills: EmployeeSkill[];
}

export interface TargetJobRole {
  id: string;
  title: string;
  domain: string;
  description: string;
  requiredSkills: {
    skillName: string;
    targetProficiency: SkillProficiency;
    priority: 'High' | 'Medium' | 'Low';
  }[];
}

export interface SkillGapAnalysisResult {
  id: string;
  userId: string;
  targetRoleId: string;
  analyzedAt: string;
  mlModelVersion: string;
  status: 'staged_for_ml' | 'completed';
  message: string;
}
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string;   // 'YYYY-MM-DD'
  endDate: string;     // 'YYYY-MM-DD'
  requiredSkills: string[];
  teamSize: number;
  createdAt: string;   // ISO timestamp, set by the backend
}

// Used when creating a project from the dashboard (id and createdAt come from the backend)
export type NewProject = Omit<Project, 'id' | 'createdAt'>;