import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const username = process.env.BOOTSTRAP_ADMIN_USERNAME || "admin";
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || "admin123";
const name = process.env.BOOTSTRAP_ADMIN_NAME || "酒小琳";

try {
  const users = await prisma.user.count();
  if (users > 0) {
    console.log("[lighttask] users already exist, bootstrap skipped");
    process.exit(0);
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  await prisma.user.create({
    data: {
      username,
      passwordHash,
      name,
      role: "SUPER_ADMIN",
      enabled: true,
      avatar: name.slice(0, 1) || "管",
      signature: "让项目主线清楚，细节有迹可循。",
      theme: "letter",
    },
  });

  console.log(`[lighttask] bootstrap admin created: ${username}`);
} finally {
  await prisma.$disconnect();
}
