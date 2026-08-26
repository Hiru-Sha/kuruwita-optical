-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "nic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "rightSPH" DOUBLE PRECISION,
    "rightCYL" DOUBLE PRECISION,
    "rightAXIS" INTEGER,
    "rightADD" DOUBLE PRECISION,
    "leftSPH" DOUBLE PRECISION,
    "leftCYL" DOUBLE PRECISION,
    "leftAXIS" INTEGER,
    "leftADD" DOUBLE PRECISION,
    "pd" DOUBLE PRECISION,
    "doctor" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
