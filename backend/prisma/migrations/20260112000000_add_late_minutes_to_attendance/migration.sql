/*
  Warnings:

  - Added the optional column `lateMinutes` to the `attendances` table.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable - Add lateMinutes column (nullable since it's optional in schema)
ALTER TABLE [dbo].[attendances] ADD [lateMinutes] INT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
