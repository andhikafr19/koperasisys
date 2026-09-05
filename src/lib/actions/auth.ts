'use server';

import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSession, destroySession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function loginAction(prevState: any, formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { error: 'Username dan password wajib diisi.' };
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: username.trim() },
        { email: username.trim() },
      ],
    },
    include: {
      member: true,
    },
  });

  if (!user || !user.isActive) {
    return { error: 'Akun tidak ditemukan atau telah dinonaktifkan.' };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { error: 'Password yang Anda masukkan salah.' };
  }

  await createSession({
    id: user.id,
    username: user.username,
    fullName: user.member?.fullName || user.username,
    role: user.role,
    memberId: user.member?.id,
    memberNo: user.member?.memberNo,
  });

  redirect('/dashboard');
}

export async function quickDemoLoginAction(role: Role) {
  const user = await prisma.user.findFirst({
    where: { role, isActive: true },
    include: { member: true },
  });

  if (!user) {
    throw new Error(`Tidak ditemukan akun demo untuk role ${role}.`);
  }

  await createSession({
    id: user.id,
    username: user.username,
    fullName: user.member?.fullName || user.username,
    role: user.role,
    memberId: user.member?.id,
    memberNo: user.member?.memberNo,
  });

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}
