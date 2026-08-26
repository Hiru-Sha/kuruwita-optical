/*
  Warnings:

  - You are about to drop the column `address` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `nic` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `doctor` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `leftADD` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `leftAXIS` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `leftCYL` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `leftSPH` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `rightADD` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `rightAXIS` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `rightCYL` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `rightSPH` on the `Prescription` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[phone]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `age` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourceType` to the `Prescription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "address",
DROP COLUMN "nic",
ADD COLUMN     "age" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'Mr';

-- AlterTable
ALTER TABLE "Prescription" DROP COLUMN "doctor",
DROP COLUMN "leftADD",
DROP COLUMN "leftAXIS",
DROP COLUMN "leftCYL",
DROP COLUMN "leftSPH",
DROP COLUMN "rightADD",
DROP COLUMN "rightAXIS",
DROP COLUMN "rightCYL",
DROP COLUMN "rightSPH",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hospitalName" TEXT,
ADD COLUMN     "lAdd" DOUBLE PRECISION,
ADD COLUMN     "lAxis" INTEGER,
ADD COLUMN     "lCyl" DOUBLE PRECISION,
ADD COLUMN     "lSph" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "rAdd" DOUBLE PRECISION,
ADD COLUMN     "rAxis" INTEGER,
ADD COLUMN     "rCyl" DOUBLE PRECISION,
ADD COLUMN     "rSph" DOUBLE PRECISION,
ADD COLUMN     "sourceType" TEXT NOT NULL DEFAULT 'HOSPITAL';

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");
