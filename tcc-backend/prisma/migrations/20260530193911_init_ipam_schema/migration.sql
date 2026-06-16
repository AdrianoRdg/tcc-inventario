-- CreateTable
CREATE TABLE "subnets" (
    "id" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subnets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ip_hosts" (
    "id" TEXT NOT NULL,
    "ipAddress" INET NOT NULL,
    "description" TEXT,
    "subnetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ip_hosts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subnets_network_key" ON "subnets"("network");

-- CreateIndex
CREATE UNIQUE INDEX "ip_hosts_ipAddress_key" ON "ip_hosts"("ipAddress");

-- AddForeignKey
ALTER TABLE "subnets" ADD CONSTRAINT "subnets_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "subnets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ip_hosts" ADD CONSTRAINT "ip_hosts_subnetId_fkey" FOREIGN KEY ("subnetId") REFERENCES "subnets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
