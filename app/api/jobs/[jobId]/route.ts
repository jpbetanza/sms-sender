import { NextResponse } from "next/server";
import { obterJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params;
  const job = obterJob(jobId);
  if (!job) {
    return NextResponse.json({ erro: "job_desconhecido" }, { status: 404 });
  }
  return NextResponse.json(job);
}
