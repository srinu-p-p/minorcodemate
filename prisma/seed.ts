import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CodeSync database...');

  // Clean existing records if any
  await prisma.snapshot.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectFile.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Users
  const alex = await prisma.user.create({
    data: {
      email: 'alex@codesync.dev',
      name: 'Alex Rivers',
      passwordHash,
      role: 'Lead Architect',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
  });

  const sarah = await prisma.user.create({
    data: {
      email: 'sarah@codesync.dev',
      name: 'Sarah Chen',
      passwordHash,
      role: 'Senior Full-Stack Engineer',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    },
  });

  const marcus = await prisma.user.create({
    data: {
      email: 'marcus@codesync.dev',
      name: 'Marcus Vance',
      passwordHash,
      role: 'DevOps & Systems Specialist',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
  });

  console.log('✅ Created 3 demo users:');
  console.log('   - alex@codesync.dev (Password123!)');
  console.log('   - sarah@codesync.dev (Password123!)');
  console.log('   - marcus@codesync.dev (Password123!)');

  // 2. Create Project 1: Distributed Task Scheduler
  const project1 = await prisma.project.create({
    data: {
      name: 'Distributed Task Scheduler',
      description: 'Fault-tolerant job scheduling queue with worker heartbeat tracking, priority dispatch, and automatic retries.',
      ownerId: alex.id,
      members: {
        create: [
          { userId: alex.id, role: 'owner' },
          { userId: sarah.id, role: 'editor' },
          { userId: marcus.id, role: 'viewer' },
        ],
      },
      files: {
        create: [
          {
            name: 'index.js',
            path: 'src/index.js',
            language: 'javascript',
            content: `/**
 * Distributed Task Scheduler - Main Coordinator
 * CodeSync Collaborative Workspace
 */

const express = require('express');
const { TaskQueue } = require('./scheduler');
const { WorkerPool } = require('./worker');

const app = express();
const queue = new TaskQueue({ maxRetries: 3, timeoutMs: 5000 });
const workers = new WorkerPool({ size: 4 });

app.use(express.json());

// Enqueue new job
app.post('/jobs', async (req, res) => {
  const { taskName, payload, priority = 'normal' } = req.body;
  
  if (!taskName) {
    return res.status(400).json({ error: 'Task name is required' });
  }

  const job = queue.enqueue({
    name: taskName,
    payload,
    priority,
    enqueuedAt: Date.now()
  });

  res.status(202).json({
    status: 'enqueued',
    jobId: job.id,
    estimatedStart: 'instant'
  });
});

// Queue Health Metrics
app.get('/health', (req, res) => {
  res.json({
    activeWorkers: workers.getActiveCount(),
    pendingJobs: queue.getPendingCount(),
    processedCount: queue.getProcessedCount(),
    uptime: process.uptime()
  });
});

console.log("Coordinator initialized and listening for worker registrations.");
`,
          },
          {
            name: 'scheduler.ts',
            path: 'src/scheduler.ts',
            language: 'typescript',
            content: `export interface Job<T = any> {
  id: string;
  name: string;
  payload: T;
  priority: 'low' | 'normal' | 'high' | 'critical';
  attempts: number;
  maxRetries: number;
  enqueuedAt: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export class TaskQueue {
  private queue: Job[] = [];
  private processed: number = 0;
  private maxRetries: number;
  private timeoutMs: number;

  constructor(options: { maxRetries?: number; timeoutMs?: number } = {}) {
    this.maxRetries = options.maxRetries ?? 3;
    this.timeoutMs = options.timeoutMs ?? 10000;
  }

  public enqueue<T>(jobData: Omit<Job<T>, 'id' | 'attempts' | 'status' | 'maxRetries'>): Job<T> {
    const job: Job<T> = {
      ...jobData,
      id: 'job_' + Math.random().toString(36).substring(2, 9),
      attempts: 0,
      maxRetries: this.maxRetries,
      status: 'pending',
    };

    // Priority sorting
    const priorityWeight = { critical: 4, high: 3, normal: 2, low: 1 };
    this.queue.push(job);
    this.queue.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

    return job;
  }

  public dequeue(): Job | undefined {
    const job = this.queue.shift();
    if (job) {
      job.status = 'processing';
      job.attempts += 1;
    }
    return job;
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public getProcessedCount(): number {
    return this.processed;
  }
}
`,
          },
          {
            name: 'worker.ts',
            path: 'src/worker.ts',
            language: 'typescript',
            content: `export class WorkerPool {
  private size: number;
  private activeCount: number = 0;
  private circuitBreakerTripped: boolean = false;
  private consecutiveFailures: number = 0;

  constructor(options: { size?: number } = {}) {
    this.size = options.size ?? 4;
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public async executeJob<T>(jobId: string, fn: () => Promise<T>): Promise<T> {
    if (this.circuitBreakerTripped) {
      throw new Error("Circuit breaker is OPEN. Workers unavailable.");
    }

    if (this.activeCount >= this.size) {
      throw new Error("Worker capacity reached.");
    }

    this.activeCount++;
    try {
      const result = await fn();
      this.consecutiveFailures = 0;
      return result;
    } catch (err) {
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= 5) {
        this.circuitBreakerTripped = true;
        console.warn("WorkerPool circuit breaker tripped after 5 continuous failures!");
      }
      throw err;
    } finally {
      this.activeCount--;
    }
  }

  public resetCircuit(): void {
    this.circuitBreakerTripped = false;
    this.consecutiveFailures = 0;
  }
}
`,
          },
          {
            name: 'README.md',
            path: 'README.md',
            language: 'markdown',
            content: `# Distributed Task Scheduler

An enterprise-grade in-memory job coordination engine designed for asynchronous distributed tasks.

## Key Subsystems
1. **Priority Scheduling**: Weighted dispatch based on urgency (critical > high > normal > low).
2. **Circuit Breaker**: Worker pool trips after 5 consecutive job crashes to prevent cascading outages.
3. **Collaboration**: Maintained concurrently on CodeSync workspace.
`,
          },
        ],
      },
      tasks: {
        create: [
          {
            title: 'Implement Exponential Backoff in Scheduler',
            description: 'Add randomized jitter to retry intervals to prevent thundering herd problems.',
            status: 'completed',
            priority: 'high',
            order: 0,
            creatorId: alex.id,
            assigneeId: sarah.id,
          },
          {
            title: 'Add Circuit Breaker to Worker Pool',
            description: 'Implement automatic circuit opening when downstream API failure rates exceed 50%.',
            status: 'in_progress',
            priority: 'urgent',
            order: 1,
            creatorId: alex.id,
            assigneeId: sarah.id,
          },
          {
            title: 'Audit Memory Leaks under Heavy Concurrency',
            description: 'Profile heap usage when 10,000 synthetic jobs are enqueued in rapid succession.',
            status: 'todo',
            priority: 'high',
            order: 2,
            creatorId: sarah.id,
            assigneeId: marcus.id,
          },
          {
            title: 'Add Prometheus Metrics Endpoint',
            description: 'Expose job completion rates and queue latency histograms for Grafana monitoring.',
            status: 'todo',
            priority: 'medium',
            order: 3,
            creatorId: marcus.id,
          },
        ],
      },
    },
  });

  // Create Snapshot for Project 1
  const project1Files = await prisma.projectFile.findMany({
    where: { projectId: project1.id },
  });

  await prisma.snapshot.create({
    data: {
      projectId: project1.id,
      creatorId: alex.id,
      title: 'v0.1.0 - Core Coordinator & Queue Architecture',
      description: 'Baseline implementation of FIFO priority scheduling with queue length guards.',
      filesJson: JSON.stringify(
        project1Files.map((f) => ({
          name: f.name,
          path: f.path,
          content: f.content,
          language: f.language,
        }))
      ),
      isRestored: false,
    },
  });

  // 3. Create Project 2: Collaborative Markdown Engine
  const project2 = await prisma.project.create({
    data: {
      name: 'Collaborative Markdown Engine',
      description: 'AST-based Markdown tokenizer and streaming HTML compiler with syntax highlighting.',
      ownerId: sarah.id,
      members: {
        create: [
          { userId: sarah.id, role: 'owner' },
          { userId: alex.id, role: 'editor' },
        ],
      },
      files: {
        create: [
          {
            name: 'parser.ts',
            path: 'src/parser.ts',
            language: 'typescript',
            content: `export interface Token {
  type: 'heading' | 'paragraph' | 'code_block' | 'list_item';
  level?: number;
  content: string;
}

export function parseMarkdown(source: string): Token[] {
  const lines = source.split('\\n');
  const tokens: Token[] = [];

  for (const line of lines) {
    if (line.startsWith('# ')) {
      tokens.push({ type: 'heading', level: 1, content: line.slice(2) });
    } else if (line.startsWith('## ')) {
      tokens.push({ type: 'heading', level: 2, content: line.slice(3) });
    } else if (line.trim().length > 0) {
      tokens.push({ type: 'paragraph', content: line.trim() });
    }
  }

  return tokens;
}
`,
          },
          {
            name: 'renderer.js',
            path: 'src/renderer.js',
            language: 'javascript',
            content: `function renderToHtml(tokens) {
  return tokens.map(t => {
    switch (t.type) {
      case 'heading':
        return \`<h\${t.level}>\${escapeHtml(t.content)}</h\${t.level}>\`;
      case 'paragraph':
        return \`<p>\${escapeHtml(t.content)}</p>\`;
      default:
        return \`<div>\${escapeHtml(t.content)}</div>\`;
    }
  }).join('\\n');
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

module.exports = { renderToHtml };
`,
          },
        ],
      },
      tasks: {
        create: [
          {
            title: 'Support GFM Tables and Strikethrough',
            description: 'Extend grammar rules to identify pipe-delimited table rows.',
            status: 'in_progress',
            priority: 'high',
            order: 0,
            creatorId: sarah.id,
            assigneeId: sarah.id,
          },
          {
            title: 'Sanitize Dangerous Script Tags',
            description: 'Prevent DOM-based XSS when parsing raw HTML blocks.',
            status: 'completed',
            priority: 'urgent',
            order: 1,
            creatorId: alex.id,
            assigneeId: sarah.id,
          },
        ],
      },
    },
  });

  const project2Files = await prisma.projectFile.findMany({
    where: { projectId: project2.id },
  });

  await prisma.snapshot.create({
    data: {
      projectId: project2.id,
      creatorId: sarah.id,
      title: 'v1.0.0 - AST Tokenizer Baseline',
      description: 'Initial release with heading extraction and safe HTML escaping.',
      filesJson: JSON.stringify(
        project2Files.map((f) => ({
          name: f.name,
          path: f.path,
          content: f.content,
          language: f.language,
        }))
      ),
      isRestored: false,
    },
  });

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
