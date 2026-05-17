const fs = require('fs');

const data = JSON.parse(fs.readFileSync('/tmp/executions.json', 'utf8'));
const recent = data.slice(-30);
const byWorkflow = {};

for (const e of recent) {
  const key = e.workflowId || 'unknown';
  if (!byWorkflow[key]) {
    byWorkflow[key] = { total: 0, success: 0, error: 0, waiting: 0, last: null };
  }
  byWorkflow[key].total += 1;
  if (e.status === 'success') byWorkflow[key].success += 1;
  else if (e.status === 'error') byWorkflow[key].error += 1;
  else byWorkflow[key].waiting += 1;
  byWorkflow[key].last = e.startedAt || e.createdAt || byWorkflow[key].last;
}

console.log('recent_execution_count', recent.length);
for (const [workflowId, stats] of Object.entries(byWorkflow)) {
  console.log(workflowId, JSON.stringify(stats));
}
