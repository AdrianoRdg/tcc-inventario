-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('Switch', 'Router', 'Firewall', 'AccessPoint', 'Server');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('Online', 'Offline');

-- CreateTable
CREATE TABLE "hosts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "login" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "type" "DeviceType" NOT NULL,
    "status" "DeviceStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hosts_pkey" PRIMARY KEY ("id")
);
