// src/app/api/invoices/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id },
    include: { customer: true, payments: true, reminders: true },
  });
  if (!invoice) return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({ where: { id, userId: session.user.id } });
  if (!invoice) return NextResponse.json({ message: "Invoice not found" }, { status: 404 });

  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ message: "Invoice deleted successfully" });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { status } = body;
  // Only allow cancelling via status change to CANCELLED
  if (!status) return NextResponse.json({ message: "Missing status" }, { status: 400 });

  const invoice = await prisma.invoice.findFirst({ where: { id, userId: session.user.id } });
  if (!invoice) return NextResponse.json({ message: "Invoice not found" }, { status: 404 });

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status },
  });
  return NextResponse.json({ message: "Invoice updated", invoice: updated });
}
