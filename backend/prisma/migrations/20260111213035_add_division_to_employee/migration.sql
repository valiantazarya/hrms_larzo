/*
  Warnings:

  - You are about to drop the column `requiresOwnerApproval` on the `attendance_adjustments` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- Drop the default constraint first before dropping the column
IF EXISTS (SELECT * FROM sys.default_constraints WHERE name = 'attendance_adjustments_requiresOwnerApproval_df')
BEGIN
    ALTER TABLE [dbo].[attendance_adjustments] DROP CONSTRAINT [attendance_adjustments_requiresOwnerApproval_df];
END;

-- AlterTable - Drop the column
ALTER TABLE [dbo].[attendance_adjustments] DROP COLUMN [requiresOwnerApproval];

-- AlterTable - Add division column (nullable since it's optional in schema)
ALTER TABLE [dbo].[employees] ADD [division] NVARCHAR(1000);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
