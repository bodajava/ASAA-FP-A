import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export type RowValidator = (
  row: Record<string, string | number | boolean | null>,
  rowNumber: number,
) => {
  valid: boolean;
  errors: string[];
  mapped: Record<string, string | number | boolean | null> | null;
};

export interface ImportResult {
  jobId: string;
  status: string;
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  skippedRows: number;
  progressPct: number;
  errors: string[];
}

@Injectable()
export class EnterpriseImportService {
  constructor(private readonly prisma: PrismaService) {}

  async createJob(params: {
    companyId: bigint;
    userId?: bigint;
    module: string;
    fileName?: string;
    totalRows: number;
    mappingConfig?: string;
  }) {
    const job = await this.prisma.importJob.create({
      data: {
        companyId: params.companyId,
        userId: params.userId ?? null,
        module: params.module,
        fileName: params.fileName ?? null,
        totalRows: params.totalRows,
        mappingConfig: params.mappingConfig ?? null,
        status: 'pending',
      },
    });
    return {
      ...job,
      id: job.id.toString(),
      companyId: job.companyId.toString(),
      userId: job.userId?.toString() ?? null,
    };
  }

  async processChunk(
    jobId: bigint,
    companyId: bigint,
    rows: Record<string, string | number | boolean | null>[],
    startRow: number,
    validateRow: RowValidator,
  ): Promise<ImportResult> {
    const job = await this.prisma.importJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Import job not found');
    if (job.companyId !== companyId)
      throw new NotFoundException('Import job not found');
    if (job.status === 'cancelled')
      throw new BadRequestException('Import job was cancelled');

    if (job.status === 'pending') {
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: { status: 'processing', startedAt: new Date() },
      });
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    const lineData: Array<{
      jobId: bigint;
      rowNumber: number;
      status: string;
      errors: string | null;
      mappedData: string | null;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = startRow + i;
      const result = validateRow(row, rowNum);

      if (result.valid && result.mapped) {
        lineData.push({
          jobId,
          rowNumber: rowNum,
          status: 'success',
          errors: null,
          mappedData: JSON.stringify(result.mapped),
        });
        successCount++;
      } else {
        lineData.push({
          jobId,
          rowNumber: rowNum,
          status: 'failed',
          errors: JSON.stringify(result.errors),
          mappedData: null,
        });
        failedCount++;
        errors.push(...result.errors.map((e) => `Row ${rowNum}: ${e}`));
      }
    }

    await this.prisma.importJobLine.createMany({ data: lineData });

    const totalProcessed = job.processedRows + rows.length;
    const progressPct =
      job.totalRows > 0 ? (totalProcessed / job.totalRows) * 100 : 0;
    const isComplete = progressPct >= 100;

    const updated = await this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: isComplete ? 'completed' : 'processing',
        processedRows: totalProcessed,
        successRows: job.successRows + successCount,
        failedRows: job.failedRows + failedCount,
        progressPct: Math.min(progressPct, 100),
        completedAt: isComplete ? new Date() : null,
        errorLog: errors.length > 0 ? errors.join('\n') : job.errorLog,
      },
    });

    if (isComplete && updated.userId) {
      await this.prisma.notification.create({
        data: {
          companyId,
          userId: updated.userId,
          title: `Import completed: ${updated.module}`,
          body: `${updated.successRows} succeeded, ${updated.failedRows} failed out of ${updated.totalRows} rows.`,
          channel: 'system',
          entityType: 'import_job',
          entityId: jobId,
          status: 'pending',
        },
      });
    }

    return {
      jobId: job.id.toString(),
      status: isComplete ? 'completed' : 'processing',
      totalRows: job.totalRows,
      processedRows: totalProcessed,
      successRows: job.successRows + successCount,
      failedRows: job.failedRows + failedCount,
      skippedRows: job.skippedRows,
      progressPct: Math.min(progressPct, 100),
      errors,
    };
  }

  async getJobStatus(jobId: bigint, companyId: bigint) {
    const job = await this.prisma.importJob.findUnique({
      where: { id: jobId },
      include: {
        importLines: {
          where: { status: 'failed' },
          take: 50,
          orderBy: { rowNumber: 'asc' },
        },
      },
    });
    if (!job) throw new NotFoundException('Import job not found');
    if (job.companyId !== companyId)
      throw new NotFoundException('Import job not found');

    return {
      ...job,
      id: job.id.toString(),
      companyId: job.companyId.toString(),
      userId: job.userId?.toString() ?? null,
      importLines: job.importLines.map((l) => ({
        ...l,
        id: l.id.toString(),
        jobId: l.jobId.toString(),
      })),
    };
  }

  async cancelJob(jobId: bigint, companyId: bigint) {
    const job = await this.prisma.importJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Import job not found');
    if (job.companyId !== companyId)
      throw new NotFoundException('Import job not found');
    if (job.status === 'completed')
      throw new BadRequestException('Job already completed');

    const updated = await this.prisma.importJob.update({
      where: { id: jobId },
      data: { status: 'cancelled', completedAt: new Date() },
    });

    if (updated.userId) {
      await this.prisma.notification.create({
        data: {
          companyId,
          userId: updated.userId,
          title: `Import cancelled: ${updated.module}`,
          body: `Import job for ${updated.module} was cancelled.`,
          channel: 'system',
          entityType: 'import_job',
          entityId: jobId,
          status: 'pending',
        },
      });
    }

    return {
      ...updated,
      id: updated.id.toString(),
      companyId: updated.companyId.toString(),
      userId: updated.userId?.toString() ?? null,
    };
  }

  async retryFailedRows(jobId: bigint, companyId: bigint) {
    const job = await this.prisma.importJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Import job not found');
    if (job.companyId !== companyId)
      throw new NotFoundException('Import job not found');

    const failedLines = await this.prisma.importJobLine.findMany({
      where: { jobId, status: 'failed' },
    });

    if (failedLines.length === 0) {
      throw new BadRequestException('No failed rows to retry');
    }

    await this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'pending',
        processedRows: job.processedRows - failedLines.length,
        failedRows: 0,
        progressPct: 0,
        startedAt: null,
        completedAt: null,
      },
    });

    await this.prisma.importJobLine.deleteMany({
      where: { jobId, status: 'failed' },
    });

    return { retriedRows: failedLines.length };
  }

  async getImportHistory(
    companyId: bigint,
    module?: string,
    page = 1,
    limit = 20,
  ) {
    const where: { companyId: bigint; module?: string } = { companyId };
    if (module) where.module = module;

    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      this.prisma.importJob.count({ where }),
      this.prisma.importJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: data.map((j) => ({
        ...j,
        id: j.id.toString(),
        companyId: j.companyId.toString(),
        userId: j.userId?.toString() ?? null,
      })),
    };
  }

  async getImportLogs(jobId: bigint, companyId: bigint, page = 1, limit = 50) {
    const job = await this.prisma.importJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Import job not found');
    if (job.companyId !== companyId)
      throw new NotFoundException('Import job not found');

    const skip = (page - 1) * limit;
    const [total, lines] = await Promise.all([
      this.prisma.importJobLine.count({ where: { jobId } }),
      this.prisma.importJobLine.findMany({
        where: { jobId },
        orderBy: { rowNumber: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: lines.map((l) => ({
        ...l,
        id: l.id.toString(),
        jobId: l.jobId.toString(),
      })),
    };
  }

  async cleanupOldJobs(companyId: bigint, daysOld = 30) {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const deleted = await this.prisma.importJob.deleteMany({
      where: {
        companyId,
        status: { in: ['completed', 'cancelled'] },
        completedAt: { lt: cutoff },
      },
    });
    return { deletedCount: deleted.count };
  }
}
