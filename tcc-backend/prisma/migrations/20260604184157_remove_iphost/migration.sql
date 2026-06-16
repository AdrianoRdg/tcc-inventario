/*
  Warnings:

  - You are about to drop the column `vlan` on the `hosts` table. All the data in the column will be lost.
  - You are about to drop the `ip_hosts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ip_hosts" DROP CONSTRAINT "ip_hosts_subnetId_fkey";

-- AlterTable
ALTER TABLE "hosts" DROP COLUMN "vlan";

-- DropTable
DROP TABLE "ip_hosts";
