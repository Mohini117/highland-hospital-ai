/*
  Warnings:

  - A unique constraint covering the columns `[day_of_week]` on the table `working_days` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "working_days_day_of_week_key" ON "working_days"("day_of_week");
