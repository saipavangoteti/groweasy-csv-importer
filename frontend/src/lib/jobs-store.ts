interface Job {
  originalRecords: Record<string, string>[];
  fileName: string;
  status: string;
}

const globalForJobs = globalThis as unknown as { jobs: Map<string, Job> };

if (!globalForJobs.jobs) {
  globalForJobs.jobs = new Map<string, Job>();
}

export const jobs = globalForJobs.jobs;
