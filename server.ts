import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { DBSQLClient } from "@databricks/sql";
import { insightsRouter } from "./server/insightsRoutes";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use("/api/insights", insightsRouter);

// In-memory "Database"
let users = [
  { id: '1', name: 'Sarah Miller', employeeKey: 'EMP001', password: bcrypt.hashSync('password123', 10), role: 'admin', department: 'Operations', maxWeeklyHours: 40, preferences: ['Morning', 'Afternoon', 'Night'] },
  { id: '2', name: 'Marcus Chen', employeeKey: 'EMP002', password: bcrypt.hashSync('password123', 10), role: 'employee', department: 'Operations', maxWeeklyHours: 35, preferences: ['Morning', 'Afternoon', 'Night'] }
];

let assignments: any[] = [];
let swaps: any[] = [];
let shiftRotationCounter: Record<string, number> = {};
const activeTokens: Record<string, string> = {
  'sm_seed_token_1': '1',
  'sm_seed_token_2': '2'
};

// Normalized Skills & Upskilling Architecture
export interface EmployeeSkillProfile {
  id: string;
  userId: string;
  domain: string;
  customDomain?: string;
  isBeginner: boolean;
  targetRole?: string;
  updatedAt: string;
}

export interface EmployeeSkillRecord {
  id: string;
  profileId: string;
  userId: string;
  skillName: string;
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced';
  yearsOfExperience?: number;
  domain: string;
  isCustom?: boolean;
  createdAt: string;
}

const DOMAINS_CATALOG: Record<string, string[]> = {
  'Artificial Intelligence & Machine Learning': [
    'Python',
    'NumPy',
    'Pandas',
    'Scikit-learn',
    'TensorFlow',
    'PyTorch',
    'Machine Learning',
    'Deep Learning',
    'Data Preprocessing',
    'Model Evaluation'
  ],
  'Web Development': [
    'HTML',
    'CSS',
    'JavaScript',
    'React',
    'Node.js',
    'REST APIs',
    'SQL',
    'Git',
    'TypeScript',
    'Next.js'
  ],
  'Data Science & Analytics': [
    'Python',
    'SQL',
    'Excel',
    'Pandas',
    'Power BI',
    'Tableau',
    'Statistics',
    'Data Visualization',
    'R',
    'Apache Spark'
  ],
  'Cybersecurity': [
    'Computer Networking',
    'Linux',
    'Python',
    'Wireshark',
    'Vulnerability Assessment',
    'SIEM',
    'Incident Response',
    'Cryptography',
    'Penetration Testing'
  ],
  'Cloud Computing': [
    'AWS',
    'Microsoft Azure',
    'Google Cloud',
    'Docker',
    'Kubernetes',
    'Terraform',
    'CI/CD',
    'Linux',
    'Serverless'
  ],
  'Software Development': [
    'Java',
    'C++',
    'C#',
    'Python',
    'Object-Oriented Design',
    'Data Structures & Algorithms',
    'Design Patterns',
    'Git',
    'Unit Testing',
    'Microservices'
  ],
  'UI/UX Design': [
    'Figma',
    'Adobe XD',
    'Wireframing',
    'Prototyping',
    'User Research',
    'Design Systems',
    'Usability Testing',
    'Interaction Design',
    'Information Architecture'
  ],
  'Database Administration': [
    'PostgreSQL',
    'MySQL',
    'MongoDB',
    'Redis',
    'Query Optimization',
    'Database Backup & Recovery',
    'Data Modeling',
    'Indexing',
    'Replication'
  ],
  'DevOps': [
    'CI/CD Pipelines',
    'Docker',
    'Kubernetes',
    'Linux',
    'Ansible',
    'Terraform',
    'Prometheus',
    'Grafana',
    'Bash Scripting',
    'Infrastructure as Code'
  ],
  'Human Resources': [
    'Talent Acquisition',
    'Employee Onboarding',
    'Performance Management',
    'Conflict Resolution',
    'HRIS',
    'Labor Law Compliance',
    'Compensation & Benefits'
  ],
  'Finance': [
    'Financial Modeling',
    'Budgeting & Forecasting',
    'Excel',
    'Accounting Principles',
    'Risk Analysis',
    'Financial Reporting',
    'SAP',
    'Tax Compliance'
  ],
  'Operations': [
    'Process Optimization',
    'Supply Chain Management',
    'Inventory Control',
    'Lean Six Sigma',
    'Quality Assurance',
    'Project Management',
    'Vendor Management'
  ],
  'Other': []
};

const TARGET_JOB_ROLES = [
  {
    id: 'role_ai_engineer',
    title: 'Senior AI & Machine Learning Engineer',
    domain: 'Artificial Intelligence & Machine Learning',
    description: 'Architects enterprise generative AI, deep learning models, and production inference pipelines.',
    requiredSkills: [
      { skillName: 'Python', targetProficiency: 'Advanced', priority: 'High' },
      { skillName: 'PyTorch', targetProficiency: 'Advanced', priority: 'High' },
      { skillName: 'Machine Learning', targetProficiency: 'Advanced', priority: 'High' },
      { skillName: 'Model Evaluation', targetProficiency: 'Intermediate', priority: 'High' },
      { skillName: 'Data Preprocessing', targetProficiency: 'Intermediate', priority: 'Medium' },
      { skillName: 'TensorFlow', targetProficiency: 'Intermediate', priority: 'Medium' }
    ]
  },
  {
    id: 'role_fullstack_lead',
    title: 'Lead Full-Stack Web Architect',
    domain: 'Web Development',
    description: 'Designs reactive distributed web platforms, high-throughput REST APIs, and microservices.',
    requiredSkills: [
      { skillName: 'React', targetProficiency: 'Advanced', priority: 'High' },
      { skillName: 'Node.js', targetProficiency: 'Advanced', priority: 'High' },
      { skillName: 'TypeScript', targetProficiency: 'Advanced', priority: 'High' },
      { skillName: 'SQL', targetProficiency: 'Intermediate', priority: 'High' },
      { skillName: 'REST APIs', targetProficiency: 'Advanced', priority: 'High' },
      { skillName: 'Git', targetProficiency: 'Intermediate', priority: 'Medium' }
    ]
  },
  {
    id: 'role_cloud_security',
    title: 'Cloud Solutions & Security Architect',
    domain: 'Cloud Computing',
    description: 'Designs resilient multi-cloud architectures, Kubernetes orchestration, and Zero-Trust networks.',
    requiredSkills: [
      { skillName: 'AWS', targetProficiency: 'Advanced', priority: 'High' },
      { skillName: 'Docker', targetProficiency: 'Advanced', priority: 'High' },
      { skillName: 'Kubernetes', targetProficiency: 'Intermediate', priority: 'High' },
      { skillName: 'Linux', targetProficiency: 'Advanced', priority: 'High' },
      { skillName: 'CI/CD', targetProficiency: 'Intermediate', priority: 'Medium' }
    ]
  },
  {
    id: 'role_data_scientist',
    title: 'Principal Data Scientist & Analytics Lead',
    domain: 'Data Science & Analytics',
    description: 'Builds predictive intelligence, big data visual analytics, and decision science models.',
    requiredSkills: [
      { skillName: 'Python', targetProficiency: 'Advanced', priority: 'High' },
      { skillName: 'SQL', targetProficiency: 'Advanced', priority: 'High' },
      { skillName: 'Pandas', targetProficiency: 'Advanced', priority: 'High' },
      { skillName: 'Statistics', targetProficiency: 'Intermediate', priority: 'High' },
      { skillName: 'Power BI', targetProficiency: 'Intermediate', priority: 'Medium' }
    ]
  },
  {
    id: 'role_cyber_lead',
    title: 'Cybersecurity & Incident Response Lead',
    domain: 'Cybersecurity',
    description: 'Manages SOC surveillance, SIEM alerts, vulnerability auditing, and intrusion triage.',
    requiredSkills: [
      { skillName: 'Linux', targetProficiency: 'Advanced', priority: 'High' },
      { skillName: 'Computer Networking', targetProficiency: 'Advanced', priority: 'High' },
      { skillName: 'SIEM', targetProficiency: 'Intermediate', priority: 'High' },
      { skillName: 'Incident Response', targetProficiency: 'Intermediate', priority: 'High' },
      { skillName: 'Wireshark', targetProficiency: 'Intermediate', priority: 'Medium' }
    ]
  },
  {
    id: 'role_devops_engineer',
    title: 'DevOps & Site Reliability Engineer',
    domain: 'DevOps',
    description: 'Automates deployment pipelines, infrastructure as code, and cluster telemetry.',
    requiredSkills: [
      { skillName: 'CI/CD Pipelines', targetProficiency: 'Advanced', priority: 'High' },
      { skillName: 'Docker', targetProficiency: 'Advanced', priority: 'High' },
      { skillName: 'Kubernetes', targetProficiency: 'Intermediate', priority: 'High' },
      { skillName: 'Terraform', targetProficiency: 'Intermediate', priority: 'Medium' },
      { skillName: 'Linux', targetProficiency: 'Advanced', priority: 'High' }
    ]
  }
];

// Normalized in-memory stores
let employeeProfiles: EmployeeSkillProfile[] = [
  {
    id: 'prof_2',
    userId: '2',
    domain: 'Web Development',
    customDomain: '',
    isBeginner: false,
    targetRole: 'role_fullstack_lead',
    updatedAt: new Date().toISOString()
  }
];

let employeeSkills: EmployeeSkillRecord[] = [
  {
    id: 'es_2_1',
    profileId: 'prof_2',
    userId: '2',
    skillName: 'JavaScript',
    proficiency: 'Advanced',
    yearsOfExperience: 4,
    domain: 'Web Development',
    isCustom: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'es_2_2',
    profileId: 'prof_2',
    userId: '2',
    skillName: 'React',
    proficiency: 'Intermediate',
    yearsOfExperience: 3,
    domain: 'Web Development',
    isCustom: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'es_2_3',
    profileId: 'prof_2',
    userId: '2',
    skillName: 'Node.js',
    proficiency: 'Intermediate',
    yearsOfExperience: 2,
    domain: 'Web Development',
    isCustom: false,
    createdAt: new Date().toISOString()
  }
];

let stagedGapAnalyses: any[] = [];

const indianHolidays = [
  "2026-01-26", // Republic Day
  "2026-05-01", // Labor Day
  "2026-08-15", // Independence Day
  "2026-10-02", // Gandhi Jayanti
  "2026-12-25", // Christmas
  "2026-05-25", // Example mock holiday
];

let shiftTemplates = [
  { id: 't1', name: 'Morning', startTime: '08:00', endTime: '16:00', breakDuration: 30, color: '#6366F1', department: 'Operations' },
  { id: 't2', name: 'Afternoon', startTime: '16:00', endTime: '00:00', breakDuration: 30, color: '#10B981', department: 'Operations' },
  { id: 't3', name: 'Night', startTime: '00:00', endTime: '08:00', breakDuration: 30, color: '#F43F5E', department: 'Operations' }
];

// Helper to authenticate request
function resolveRequestUser(req: express.Request): { user: any | null; error?: string } {
  const authHeader = req.headers.authorization;
  let userId: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (activeTokens[token]) {
      userId = activeTokens[token];
    }
  }

  if (!userId && req.headers['x-user-id']) {
    userId = String(req.headers['x-user-id']);
  }

  if (!userId && req.body && req.body.userId) {
    userId = String(req.body.userId);
  }

  if (!userId && req.query && req.query.userId) {
    userId = String(req.query.userId);
  }

  if (!userId) {
    return { user: null, error: 'Authentication required' };
  }

  const foundUser = users.find(u => String(u.id) === String(userId));
  if (!foundUser) {
    return { user: null, error: 'User not found' };
  }

  return { user: foundUser };
}

// Shared login handler (employee key + password)
async function handleLogin(req: express.Request, res: express.Response) {
  const employeeKey = String(req.body?.employeeKey ?? '').trim();
  const password = String(req.body?.password ?? '');

  if (!employeeKey || !password) {
    return res.status(400).json({ error: "Employee key and password are required" });
  }

  const user = users.find(u => u.employeeKey.toLowerCase() === employeeKey.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const { password: _, ...userWithoutPass } = user;
  const token = `sm_${Math.random().toString(36).substr(2, 20)}`;
  activeTokens[token] = user.id;
  res.json({ token, user: userWithoutPass });
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Auth endpoints
app.post("/api/auth/signup", async (req, res) => {
  const { name, employeeKey, password, role, department, preferences } = req.body;
  const cleanKey = String(employeeKey ?? '').trim();

  if (!name || !cleanKey || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const existing = users.find(u => u.employeeKey.toLowerCase() === cleanKey.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: "Employee key already registered" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: String(Date.now()),
    name,
    employeeKey: cleanKey,
    password: hashedPassword,
    role: role || 'employee',
    department: department || 'Operations',
    maxWeeklyHours: 40,
    preferences: preferences || ['Morning', 'Afternoon', 'Night']
  };

  users.push(newUser);
  const { password: _, ...userWithoutPass } = newUser;
  const token = `sm_${Math.random().toString(36).substr(2, 20)}`;
  activeTokens[token] = newUser.id;
  res.status(201).json({ user: userWithoutPass, token });
});

app.post("/api/auth/login", handleLogin);
app.post("/api/auth/signin", handleLogin);

// Users
app.get("/api/users", (req, res) => {
  const { department } = req.query;
  const filtered = department ? users.filter(u => u.department === department) : users;
  res.json(filtered.map(({ password, ...u }) => u));
});

app.get("/api/templates", (req, res) => res.json(shiftTemplates));

app.get("/api/assignments", (req, res) => {
  const { department } = req.query;
  if (department) {
    const deptUserIds = users.filter(u => u.department === department).map(u => u.id);
    return res.json(assignments.filter(a => deptUserIds.includes(a.userId)));
  }
  res.json(assignments);
});

app.post("/api/assignments", (req, res) => {
  const newAssignment = { id: Math.random().toString(36).substr(2, 9), ...req.body, status: 'assigned' };
  assignments.push(newAssignment);
  res.json(newAssignment);
});

app.delete("/api/assignments/:id", (req, res) => {
  assignments = assignments.filter(a => a.id !== req.params.id);
  res.sendStatus(204);
});

// Swap endpoints
app.get("/api/swaps", (req, res) => {
  const { department } = req.query;
  if (department) {
    const deptUserIds = users.filter(u => u.department === department).map(u => u.id);
    return res.json(swaps.filter(s => deptUserIds.includes(s.fromUserId)));
  }
  res.json(swaps);
});

app.post("/api/swaps", (req, res) => {
  const swap = {
    id: Math.random().toString(36).substr(2, 9),
    ...req.body,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  swaps.push(swap);
  res.json(swap);
});

app.patch("/api/swaps/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const swapIndex = swaps.findIndex(s => s.id === id);
  if (swapIndex !== -1) {
    swaps[swapIndex].status = status;

    if (status === 'approved') {
      const swap = swaps[swapIndex];
      const assignIdx = assignments.findIndex(a => a.id === swap.assignmentId);
      if (assignIdx !== -1) {
        const originalAssignment = assignments[assignIdx];
        const fromUserId = swap.fromUserId;
        const toUserId = swap.toUserId;
        const date = originalAssignment.date;

        const recipientAssignIdx = assignments.findIndex(a => a.userId === toUserId && a.date === date);

        if (recipientAssignIdx !== -1) {
          // EXCHANGE: Swap the owners of both shifts
          assignments[assignIdx].userId = toUserId;
          assignments[recipientAssignIdx].userId = fromUserId;
          assignments[assignIdx].status = 'swapped';
          assignments[recipientAssignIdx].status = 'swapped';
        } else {
          // MOVE: Recipient was free, they just take the shift
          assignments[assignIdx].userId = toUserId;
          assignments[assignIdx].status = 'swapped';
        }
      }
    }
    res.json(swaps[swapIndex]);
  } else {
    res.status(404).json({ error: "Swap not found" });
  }
});

app.post("/api/seed", (req, res) => {
  assignments = [];
  swaps = [];
  users = [
    { id: '1', name: 'Sarah Miller', employeeKey: 'EMP001', password: bcrypt.hashSync('password123', 10), role: 'admin', department: 'Operations', maxWeeklyHours: 40, preferences: ['Morning', 'Afternoon', 'Night'] },
    { id: '2', name: 'Marcus Chen', employeeKey: 'EMP002', password: bcrypt.hashSync('password123', 10), role: 'employee', department: 'Operations', maxWeeklyHours: 35, preferences: ['Morning', 'Afternoon', 'Night'] }
  ];
  shiftRotationCounter = {};
  employeeProfiles = [
    {
      id: 'prof_2',
      userId: '2',
      domain: 'Web Development',
      customDomain: '',
      isBeginner: false,
      targetRole: 'role_fullstack_lead',
      updatedAt: new Date().toISOString()
    }
  ];
  employeeSkills = [
    {
      id: 'es_2_1',
      profileId: 'prof_2',
      userId: '2',
      skillName: 'JavaScript',
      proficiency: 'Advanced',
      yearsOfExperience: 4,
      domain: 'Web Development',
      isCustom: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'es_2_2',
      profileId: 'prof_2',
      userId: '2',
      skillName: 'React',
      proficiency: 'Intermediate',
      yearsOfExperience: 3,
      domain: 'Web Development',
      isCustom: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'es_2_3',
      profileId: 'prof_2',
      userId: '2',
      skillName: 'Node.js',
      proficiency: 'Intermediate',
      yearsOfExperience: 2,
      domain: 'Web Development',
      isCustom: false,
      createdAt: new Date().toISOString()
    }
  ];
  stagedGapAnalyses = [];
  console.log("System Purge & Re-initialization executed");
  res.json({ message: "System reset to clean baseline" });
});

app.post("/api/generate-roster", (req, res) => {
  try {
    const { startDate, department } = req.body;
    let rosterEmployees = users.filter(u => u.role === 'employee');

    if (department) {
      rosterEmployees = rosterEmployees.filter(u => u.department === department);
    }

    if (rosterEmployees.length === 0) return res.json([]);

    const startObj = new Date(startDate);
    const endObj = new Date(startObj);
    endObj.setDate(startObj.getDate() + 14);
    const startDateStr = startObj.toISOString().split('T')[0];
    const endDateStr = endObj.toISOString().split('T')[0];
    const employeeIds = rosterEmployees.map(e => e.id);

    // Clear existing for range
    assignments = assignments.filter(a => {
      const isDateInRange = a.date >= startDateStr && a.date < endDateStr;
      const isEmployeeIncluded = employeeIds.includes(a.userId);
      return !(isDateInRange && isEmployeeIncluded);
    });

    const start = new Date(startDate);
    const generated: any[] = [];

    // Track weekly hours per employee (key is userId_weekIndex)
    const weeklyHoursTrack: Record<string, number> = {};

    for (let i = 0; i < 14; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      const weekIndex = Math.floor(i / 7);

      if (indianHolidays.includes(dateStr) || dayOfWeek === 0 || dayOfWeek === 6) continue;

      const targetPerShift = Math.floor(rosterEmployees.length / shiftTemplates.length);
      const remainder = rosterEmployees.length % shiftTemplates.length;
      const shiftAssignments: Record<string, string[]> = {};
      shiftTemplates.forEach(t => shiftAssignments[t.id] = []);

      const unassignedEmployees = [...rosterEmployees];

      // Pass 1: Preferences
      shiftTemplates.forEach(template => {
        const interestedEmps = unassignedEmployees.filter(e => e.preferences && e.preferences[0] === template.name);
        while (interestedEmps.length > 0 && shiftAssignments[template.id].length < targetPerShift) {
          const emp = interestedEmps.shift()!;
          const rotationKey = `${emp.id}_${weekIndex}`;
          const currentHours = weeklyHoursTrack[rotationKey] || 0;

          if (currentHours + 8 <= (emp.maxWeeklyHours || 40)) {
            shiftAssignments[template.id].push(emp.id);
            weeklyHoursTrack[rotationKey] = currentHours + 8;
            const idx = unassignedEmployees.findIndex(u => u.id === emp.id);
            if (idx !== -1) unassignedEmployees.splice(idx, 1);
          }
        }
      });

      // Pass 2: Round Robin
      shiftTemplates.forEach((template, tIdx) => {
        const currentTarget = targetPerShift + (tIdx < remainder ? 1 : 0);
        let attempts = 0;
        const maxAttempts = unassignedEmployees.length;

        while (shiftAssignments[template.id].length < currentTarget && unassignedEmployees.length > 0 && attempts < maxAttempts) {
          const rotationKeyGlobal = `${department || 'all'}_rotation_${template.id}`;
          const currentCounter = shiftRotationCounter[rotationKeyGlobal] || 0;
          const empIndex = currentCounter % unassignedEmployees.length;
          const emp = unassignedEmployees[empIndex];

          const weekKey = `${emp.id}_${weekIndex}`;
          const currentHours = weeklyHoursTrack[weekKey] || 0;

          if (currentHours + 8 <= (emp.maxWeeklyHours || 40)) {
            shiftAssignments[template.id].push(emp.id);
            weeklyHoursTrack[weekKey] = currentHours + 8;
            unassignedEmployees.splice(empIndex, 1);
          } else {
            // Employee hit max hours, skip for this day
            attempts++;
          }
          shiftRotationCounter[rotationKeyGlobal] = currentCounter + 1;
        }
      });

      Object.entries(shiftAssignments).forEach(([shiftId, empIds]) => {
        empIds.forEach(userId => {
          generated.push({
            id: Math.random().toString(36).substr(2, 9),
            userId,
            shiftId,
            date: dateStr,
            status: 'assigned',
            notes: 'Intelligent Rotation & Preference Allocation'
          });
        });
      });
    }

    assignments = [...assignments, ...generated];
    res.json(generated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Skills & Upskilling API Endpoints
// ==========================================

// Get domain catalog & default skills
app.get("/api/skills/domains", (req, res) => {
  res.json({
    domains: Object.keys(DOMAINS_CATALOG),
    catalog: DOMAINS_CATALOG
  });
});

// Get benchmark target roles for career advancement & ML gap comparison
app.get("/api/skills/target-roles", (req, res) => {
  res.json(TARGET_JOB_ROLES);
});

// Get authenticated employee's skills and profile
app.get("/api/skills/my-skills", (req, res) => {
  const { user, error } = resolveRequestUser(req);
  if (!user) {
    return res.status(401).json({ error: error || "Authentication required" });
  }

  const targetUserId = req.query.userId ? String(req.query.userId) : String(user.id);

  // Employees can only inspect their own skill records unless user is admin
  if (user.role !== 'admin' && String(user.id) !== targetUserId) {
    return res.status(403).json({ error: "Access denied: You can only view your own skill records" });
  }

  const profile = employeeProfiles.find(p => String(p.userId) === targetUserId) || null;
  const userSkillsList = employeeSkills.filter(s => String(s.userId) === targetUserId);

  return res.json({
    profile,
    skills: userSkillsList
  });
});

// Save or update employee's skills and professional profile
app.post("/api/skills/my-skills", (req, res) => {
  const { user, error } = resolveRequestUser(req);
  if (!user) {
    return res.status(401).json({ error: error || "Authentication required" });
  }

  const { targetUserId, domain, customDomain, isBeginner, targetRole, skills } = req.body;
  const targetId = targetUserId ? String(targetUserId) : String(user.id);

  // Employees can only modify their own skill records unless user is admin
  if (user.role !== 'admin' && String(user.id) !== targetId) {
    return res.status(403).json({ error: "Access denied: You can only modify your own skill records" });
  }

  // Server-side validation
  if (!isBeginner) {
    if (!domain || typeof domain !== 'string' || !domain.trim()) {
      return res.status(400).json({ error: "Please select a valid professional domain" });
    }
    if (domain === 'Other' && (!customDomain || !customDomain.trim())) {
      return res.status(400).json({ error: "Please specify your custom professional domain" });
    }
  }

  if (skills && !Array.isArray(skills)) {
    return res.status(400).json({ error: "Skills must be provided as an array" });
  }

  // Sanitize and validate skill items
  const validProficiencies = ['Beginner', 'Intermediate', 'Advanced'];
  const sanitizedSkills: { skillName: string; proficiency: 'Beginner' | 'Intermediate' | 'Advanced'; yearsOfExperience?: number; domain?: string; isCustom?: boolean }[] = [];
  const seenSkillNames = new Set<string>();

  if (Array.isArray(skills) && !isBeginner) {
    for (const item of skills) {
      if (!item || typeof item.skillName !== 'string' || !item.skillName.trim()) {
        continue;
      }
      const trimmedName = item.skillName.trim();
      const lower = trimmedName.toLowerCase();
      if (seenSkillNames.has(lower)) {
        continue; // deduplicate
      }
      seenSkillNames.add(lower);

      const proficiency = validProficiencies.includes(item.proficiency) ? item.proficiency : 'Intermediate';
      let years: number | undefined = undefined;
      if (item.yearsOfExperience !== undefined && item.yearsOfExperience !== null && item.yearsOfExperience !== '') {
        const parsed = Number(item.yearsOfExperience);
        if (!isNaN(parsed) && parsed >= 0) {
          years = parsed;
        }
      }

      sanitizedSkills.push({
        skillName: trimmedName,
        proficiency,
        yearsOfExperience: years,
        domain: item.domain || (domain === 'Other' ? customDomain : domain),
        isCustom: !!item.isCustom
      });
    }
  }

  // Upsert profile in normalized storage
  let profile = employeeProfiles.find(p => String(p.userId) === targetId);
  const effectiveDomain = isBeginner ? (domain || 'Starting from Scratch') : domain;
  const now = new Date().toISOString();

  if (profile) {
    profile.domain = effectiveDomain;
    profile.customDomain = domain === 'Other' ? (customDomain || '').trim() : '';
    profile.isBeginner = !!isBeginner;
    if (targetRole !== undefined) profile.targetRole = targetRole;
    profile.updatedAt = now;
  } else {
    profile = {
      id: `prof_${targetId}`,
      userId: targetId,
      domain: effectiveDomain,
      customDomain: domain === 'Other' ? (customDomain || '').trim() : '',
      isBeginner: !!isBeginner,
      targetRole: targetRole || '',
      updatedAt: now
    };
    employeeProfiles.push(profile);
  }

  // Synchronize normalized employee skills
  employeeSkills = employeeSkills.filter(s => String(s.userId) !== targetId);
  const profileId = profile.id;
  const profileDomain = profile.domain;
  const newRecords: EmployeeSkillRecord[] = isBeginner ? [] : sanitizedSkills.map(s => ({
    id: `es_${targetId}_${Math.random().toString(36).substr(2, 9)}`,
    profileId,
    userId: targetId,
    skillName: s.skillName,
    proficiency: s.proficiency,
    yearsOfExperience: s.yearsOfExperience,
    domain: s.domain || profileDomain,
    isCustom: s.isCustom,
    createdAt: now
  }));

  if (newRecords.length > 0) {
    employeeSkills.push(...newRecords);
  }

  return res.json({
    success: true,
    message: "Professional skills recorded successfully",
    profile,
    skills: newRecords
  });
});

// Future ML-based Skill Gap Analysis & Staged Recommendations
app.get("/api/skills/gap-analysis", (req, res) => {
  const { user, error } = resolveRequestUser(req);
  if (!user) {
    return res.status(401).json({ error: error || "Authentication required" });
  }

  const targetUserId = req.query.userId ? String(req.query.userId) : String(user.id);
  const profile = employeeProfiles.find(p => String(p.userId) === targetUserId);
  const currentSkills = employeeSkills.filter(s => String(s.userId) === targetUserId);
  const staged = stagedGapAnalyses.filter(a => String(a.userId) === targetUserId);

  return res.json({
    mlStatus: "staged_for_ml",
    mlModelVersion: "ml-gap-analyzer-v1.0-staged",
    message: "Your personalized skill-gap analysis and upskilling recommendations will be available after the machine learning model is integrated.",
    profileSnapshot: {
      userId: targetUserId,
      domain: profile?.domain || 'None',
      skillsCount: currentSkills.length,
      targetRole: profile?.targetRole || null
    },
    stagedRequests: staged
  });
});

// Stage a target role and skills snapshot for future ML service inference
app.post("/api/skills/gap-analysis/stage", (req, res) => {
  const { user, error } = resolveRequestUser(req);
  if (!user) {
    return res.status(401).json({ error: error || "Authentication required" });
  }

  const { targetRoleId } = req.body;
  const targetUserId = String(user.id);

  const profile = employeeProfiles.find(p => String(p.userId) === targetUserId);
  const currentSkills = employeeSkills.filter(s => String(s.userId) === targetUserId);

  const stagedRecord = {
    id: `ga_${Math.random().toString(36).substr(2, 9)}`,
    userId: targetUserId,
    targetRoleId: targetRoleId || profile?.targetRole || 'general',
    employeeSkillSnapshot: currentSkills.map(s => ({
      skillName: s.skillName,
      proficiency: s.proficiency,
      yearsOfExperience: s.yearsOfExperience
    })),
    mlModelVersion: "ml-gap-analyzer-v1.0-staged",
    status: "staged_for_ml",
    message: "Your personalized skill-gap analysis and upskilling recommendations will be available after the machine learning model is integrated.",
    stagedAt: new Date().toISOString()
  };

  stagedGapAnalyses = stagedGapAnalyses.filter(a => String(a.userId) !== targetUserId);
  stagedGapAnalyses.push(stagedRecord);

  return res.json({
    success: true,
    message: "Skill gap analysis request formatted and staged. Prepared for ML engine execution.",
    record: stagedRecord
  });
});

// ==========================================
// Databricks
// ==========================================

async function queryDatabricks(
  query: string,
  namedParameters?: Record<string, string | number>
) {
  const host = process.env.DATABRICKS_SERVER_HOSTNAME;
  const httpPath = process.env.DATABRICKS_HTTP_PATH;
  const token = process.env.DATABRICKS_TOKEN;

  if (!host || !httpPath || !token) {
    throw new Error("Databricks environment settings are missing.");
  }

  const client = new DBSQLClient();
  let session: any;

  try {
    await client.connect({ host, path: httpPath, token });
    session = await client.openSession();

    const operation = await session.executeStatement(query, {
      runAsync: true,
      maxRows: 100,
      ...(namedParameters ? { namedParameters } : {}),
    });

    try {
      return await operation.fetchAll();
    } finally {
      await operation.close();
    }
  } finally {
    if (session) await session.close();
    await client.close();
  }
}

app.get("/api/recommendations", async (_req, res) => {
  try {
    const rows = await queryDatabricks(
      "SELECT * FROM workforce_ai.default.personalized_recommendations LIMIT 100"
    );
    res.json(rows);
  } catch (error) {
    console.error("Recommendations query failed:", error);
    res.status(500).json({
      error: "Could not load recommendations from Databricks."
    });
  }
});

app.get("/api/matches", async (_req, res) => {
  try {
    const rows = await queryDatabricks(
      "SELECT * FROM workforce_ai.default.qualified_matches LIMIT 100"
    );
    res.json(rows);
  } catch (error) {
    console.error("Project matches query failed:", error);
    res.status(500).json({
      error: "Could not load project matches from Databricks."
    });
  }
});

// Vite middleware setup (must stay last so API routes are registered first)
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();