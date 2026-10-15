import { Router } from 'express';
import { getInsights, listEmployees } from './insights';

export const insightsRouter = Router();

// GET /api/insights/employees  -> list of employees (for the picker)
insightsRouter.get('/employees', (_req, res) => {
  try {
    res.json(listEmployees());
  } catch (err) {
    console.error('Insights: could not read the dataset', err);
    res.status(500).json({ error: 'Could not read the workforce dataset. Check the data folder.' });
  }
});

// GET /api/insights/E001  -> skills, project matches, workload, training for one employee
insightsRouter.get('/:id', (req, res) => {
  try {
    const result = getInsights(req.params.id);
    if (!result) return res.status(404).json({ error: 'Employee not found' });
    res.json(result);
  } catch (err) {
    console.error('Insights: calculation failed', err);
    res.status(500).json({ error: 'Could not calculate insights.' });
  }
});
