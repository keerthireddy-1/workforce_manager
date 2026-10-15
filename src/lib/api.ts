import type { Project, NewProject } from '../types';

const API_URL = 'http://localhost:5000/api';

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_URL}/projects`);
  if (!res.ok) throw new Error('Failed to load projects');
  return res.json();
}

export async function fetchExistingProjects(): Promise<NewProject[]> {
  const res = await fetch(`${API_URL}/existing-projects`);
  if (!res.ok) throw new Error('Failed to load existing projects');
  return res.json();
}

export async function createProject(project: NewProject): Promise<Project> {
  const res = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}