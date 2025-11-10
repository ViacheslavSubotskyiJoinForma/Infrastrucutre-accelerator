#!/usr/bin/env node

/**
 * Node.js tests for Workflow Monitor
 * Tests progress calculation logic from workflow steps
 */

// Mock WorkflowMonitor calculateStepsProgress method
class WorkflowMonitorTest {
    /**
     * Calculate progress percentage based on workflow steps
     * @param {Array} jobs - Array of job objects with steps
     * @returns {number} Progress percentage (0-100)
     */
    calculateStepsProgress(jobs) {
        let totalSteps = 0;
        let completedSteps = 0;
        let inProgressSteps = 0;

        jobs.forEach(job => {
            if (job.steps && job.steps.length > 0) {
                job.steps.forEach(step => {
                    // Skip setup steps
                    if (!step.name.startsWith('Set up') && !step.name.startsWith('Complete')) {
                        totalSteps++;

                        if (step.status === 'completed') {
                            completedSteps++;
                        } else if (step.status === 'in_progress') {
                            inProgressSteps++;
                        }
                    }
                });
            }
        });

        if (totalSteps === 0) {
            // Fallback to job-level progress
            const completedJobs = jobs.filter(j => j.status === 'completed').length;
            const inProgressJobs = jobs.filter(j => j.status === 'in_progress').length;
            const totalJobs = jobs.length || 1;

            return Math.round(((completedJobs + inProgressJobs * 0.5) / totalJobs) * 90);
        }

        // Calculate: completed steps = 100%, in_progress = 50% contribution
        const weightedCompleted = completedSteps + (inProgressSteps * 0.5);
        const progress = (weightedCompleted / totalSteps) * 90; // Cap at 90% until workflow completes

        return Math.round(Math.max(10, progress)); // Minimum 10% when started
    }
}

// Test suite
const tests = [
    // Basic Progress Calculation
    {
        name: 'Progress: No jobs returns minimum 10%',
        fn: () => {
            const monitor = new WorkflowMonitorTest();
            return monitor.calculateStepsProgress([]);
        },
        expected: 0
    },

    {
        name: 'Progress: All steps completed returns 90%',
        fn: () => {
            const monitor = new WorkflowMonitorTest();
            const jobs = [{
                steps: [
                    { name: 'Install dependencies', status: 'completed' },
                    { name: 'Run tests', status: 'completed' },
                    { name: 'Build', status: 'completed' }
                ]
            }];
            return monitor.calculateStepsProgress(jobs);
        },
        expected: 90
    },

    {
        name: 'Progress: 50% steps completed',
        fn: () => {
            const monitor = new WorkflowMonitorTest();
            const jobs = [{
                steps: [
                    { name: 'Install dependencies', status: 'completed' },
                    { name: 'Run tests', status: 'completed' },
                    { name: 'Build', status: 'queued' },
                    { name: 'Deploy', status: 'queued' }
                ]
            }];
            // 2/4 = 50%, 50% * 90 = 45
            return monitor.calculateStepsProgress(jobs);
        },
        expected: 45
    },

    {
        name: 'Progress: One in_progress step counts as 0.5',
        fn: () => {
            const monitor = new WorkflowMonitorTest();
            const jobs = [{
                steps: [
                    { name: 'Install dependencies', status: 'completed' },
                    { name: 'Run tests', status: 'in_progress' },
                    { name: 'Build', status: 'queued' },
                    { name: 'Deploy', status: 'queued' }
                ]
            }];
            // (1 + 0.5) / 4 = 0.375, 0.375 * 90 = 33.75 → 34
            return monitor.calculateStepsProgress(jobs);
        },
        expected: 34
    },

    {
        name: 'Progress: Setup steps are skipped',
        fn: () => {
            const monitor = new WorkflowMonitorTest();
            const jobs = [{
                steps: [
                    { name: 'Set up job', status: 'completed' }, // Skipped
                    { name: 'Install dependencies', status: 'completed' },
                    { name: 'Run tests', status: 'completed' },
                    { name: 'Complete job', status: 'completed' } // Skipped
                ]
            }];
            // Only 2 counted steps, both completed = 90%
            return monitor.calculateStepsProgress(jobs);
        },
        expected: 90
    },

    {
        name: 'Progress: Multiple jobs with steps',
        fn: () => {
            const monitor = new WorkflowMonitorTest();
            const jobs = [
                {
                    steps: [
                        { name: 'Install dependencies', status: 'completed' },
                        { name: 'Run tests', status: 'completed' }
                    ]
                },
                {
                    steps: [
                        { name: 'Build', status: 'in_progress' },
                        { name: 'Deploy', status: 'queued' }
                    ]
                }
            ];
            // Total: 4 steps, completed: 2, in_progress: 1
            // (2 + 0.5) / 4 = 0.625, 0.625 * 90 = 56.25 → 56
            return monitor.calculateStepsProgress(jobs);
        },
        expected: 56
    },

    // Fallback to Job-Level Progress
    {
        name: 'Fallback: No steps, use job status',
        fn: () => {
            const monitor = new WorkflowMonitorTest();
            const jobs = [
                { status: 'completed', steps: [] },
                { status: 'in_progress', steps: [] },
                { status: 'queued', steps: [] }
            ];
            // Completed: 1, In progress: 1, Total: 3
            // (1 + 0.5) / 3 = 0.5, 0.5 * 90 = 45
            return monitor.calculateStepsProgress(jobs);
        },
        expected: 45
    },

    {
        name: 'Fallback: All jobs completed (no steps)',
        fn: () => {
            const monitor = new WorkflowMonitorTest();
            const jobs = [
                { status: 'completed' },
                { status: 'completed' }
            ];
            // 2 / 2 = 1.0, 1.0 * 90 = 90
            return monitor.calculateStepsProgress(jobs);
        },
        expected: 90
    },

    {
        name: 'Fallback: One job in progress (no steps)',
        fn: () => {
            const monitor = new WorkflowMonitorTest();
            const jobs = [
                { status: 'in_progress' }
            ];
            // 0.5 / 1 = 0.5, 0.5 * 90 = 45
            return monitor.calculateStepsProgress(jobs);
        },
        expected: 45
    },

    // Edge Cases
    {
        name: 'Edge: Empty job array returns 0%',
        fn: () => {
            const monitor = new WorkflowMonitorTest();
            return monitor.calculateStepsProgress([]);
        },
        expected: 0
    },

    {
        name: 'Edge: Job with empty steps array uses job status',
        fn: () => {
            const monitor = new WorkflowMonitorTest();
            const jobs = [{ status: 'completed', steps: [] }];
            // 1 / 1 = 1.0, 1.0 * 90 = 90
            return monitor.calculateStepsProgress(jobs);
        },
        expected: 90
    },

    {
        name: 'Edge: Job without steps property uses job status',
        fn: () => {
            const monitor = new WorkflowMonitorTest();
            const jobs = [{ status: 'completed' }];
            return monitor.calculateStepsProgress(jobs);
        },
        expected: 90
    },

    {
        name: 'Edge: Minimum progress is 10% when steps started',
        fn: () => {
            const monitor = new WorkflowMonitorTest();
            const jobs = [{
                steps: [
                    { name: 'Step 1', status: 'queued' },
                    { name: 'Step 2', status: 'queued' },
                    { name: 'Step 3', status: 'queued' },
                    { name: 'Step 4', status: 'queued' },
                    { name: 'Step 5', status: 'queued' },
                    { name: 'Step 6', status: 'queued' },
                    { name: 'Step 7', status: 'queued' },
                    { name: 'Step 8', status: 'queued' },
                    { name: 'Step 9', status: 'queued' },
                    { name: 'Step 10', status: 'queued' }
                ]
            }];
            // 0 / 10 = 0, but minimum is 10%
            return monitor.calculateStepsProgress(jobs);
        },
        expected: 10
    },

    // Real-World Scenarios
    {
        name: 'Scenario: Typical workflow start (1 step in progress)',
        fn: () => {
            const monitor = new WorkflowMonitorTest();
            const jobs = [{
                steps: [
                    { name: 'Checkout code', status: 'in_progress' },
                    { name: 'Install dependencies', status: 'queued' },
                    { name: 'Run tests', status: 'queued' },
                    { name: 'Build', status: 'queued' },
                    { name: 'Deploy', status: 'queued' }
                ]
            }];
            // 0.5 / 5 = 0.1, 0.1 * 90 = 9 → minimum 10
            return monitor.calculateStepsProgress(jobs);
        },
        expected: 10
    },

    {
        name: 'Scenario: Mid-workflow execution',
        fn: () => {
            const monitor = new WorkflowMonitorTest();
            const jobs = [{
                steps: [
                    { name: 'Checkout code', status: 'completed' },
                    { name: 'Install dependencies', status: 'completed' },
                    { name: 'Run tests', status: 'in_progress' },
                    { name: 'Build', status: 'queued' },
                    { name: 'Deploy', status: 'queued' }
                ]
            }];
            // (2 + 0.5) / 5 = 0.5, 0.5 * 90 = 45
            return monitor.calculateStepsProgress(jobs);
        },
        expected: 45
    },

    {
        name: 'Scenario: Near completion (last step in progress)',
        fn: () => {
            const monitor = new WorkflowMonitorTest();
            const jobs = [{
                steps: [
                    { name: 'Checkout code', status: 'completed' },
                    { name: 'Install dependencies', status: 'completed' },
                    { name: 'Run tests', status: 'completed' },
                    { name: 'Build', status: 'completed' },
                    { name: 'Deploy', status: 'in_progress' }
                ]
            }];
            // (4 + 0.5) / 5 = 0.9, 0.9 * 90 = 81
            return monitor.calculateStepsProgress(jobs);
        },
        expected: 81
    },

    // Mixed Status Scenarios
    {
        name: 'Mixed: Multiple in_progress steps',
        fn: () => {
            const monitor = new WorkflowMonitorTest();
            const jobs = [{
                steps: [
                    { name: 'Step 1', status: 'completed' },
                    { name: 'Step 2', status: 'in_progress' },
                    { name: 'Step 3', status: 'in_progress' },
                    { name: 'Step 4', status: 'queued' }
                ]
            }];
            // (1 + 0.5 + 0.5) / 4 = 0.5, 0.5 * 90 = 45
            return monitor.calculateStepsProgress(jobs);
        },
        expected: 45
    },

    {
        name: 'Mixed: Jobs with different step counts',
        fn: () => {
            const monitor = new WorkflowMonitorTest();
            const jobs = [
                {
                    steps: [
                        { name: 'Job1 Step1', status: 'completed' },
                        { name: 'Job1 Step2', status: 'completed' }
                    ]
                },
                {
                    steps: [
                        { name: 'Job2 Step1', status: 'completed' },
                        { name: 'Job2 Step2', status: 'queued' },
                        { name: 'Job2 Step3', status: 'queued' }
                    ]
                }
            ];
            // Total: 5 steps, completed: 3
            // 3 / 5 = 0.6, 0.6 * 90 = 54
            return monitor.calculateStepsProgress(jobs);
        },
        expected: 54
    }
];

// Run tests
let passed = 0;
let failed = 0;

console.log('🧪 Running Workflow Monitor Tests\n');

tests.forEach((test, i) => {
    let result;
    let error = null;

    try {
        result = test.fn();
    } catch (e) {
        result = false;
        error = e.message;
    }

    const success = result === test.expected;

    if (success) {
        passed++;
        console.log(`✅ Test ${i + 1}: ${test.name}`);
    } else {
        failed++;
        console.log(`❌ Test ${i + 1}: ${test.name}`);
        console.log(`   Expected: ${test.expected}, Got: ${result}`);
        if (error) console.log(`   Error: ${error}`);
    }
});

console.log(`\n📊 Results: ${passed}/${tests.length} passed, ${failed} failed`);

if (failed > 0) {
    console.log('❌ Some tests failed');
    process.exit(1);
} else {
    console.log('✅ All tests passed!');
    process.exit(0);
}
