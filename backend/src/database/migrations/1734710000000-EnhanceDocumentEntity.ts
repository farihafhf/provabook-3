import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceDocumentEntity1734710000000 implements MigrationInterface {
  name = 'EnhanceDocumentEntity1734710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns
    await queryRunner.query(`
      ALTER TABLE "documents" 
      ADD COLUMN IF NOT EXISTS "fileUrl" character varying NOT NULL DEFAULT ''
    `);

    await queryRunner.query(`
      ALTER TABLE "documents" 
      ADD COLUMN IF NOT EXISTS "category" character varying NOT NULL DEFAULT 'other'
    `);

    await queryRunner.query(`
      ALTER TABLE "documents" 
      ADD COLUMN IF NOT EXISTS "subcategory" character varying
    `);

    await queryRunner.query(`
      ALTER TABLE "documents" 
      ADD COLUMN IF NOT EXISTS "uploadedByName" character varying NOT NULL DEFAULT 'Unknown'
    `);

    // Make documentType nullable (it's now deprecated)
    await queryRunner.query(`
      ALTER TABLE "documents" 
      ALTER COLUMN "documentType" DROP NOT NULL
    `);

    // Migrate existing documentType values to category if they exist
    await queryRunner.query(`
      UPDATE "documents" 
      SET "category" = LOWER("documentType")
      WHERE "documentType" IS NOT NULL
    `);

    // Remove defaults after migration
    await queryRunner.query(`
      ALTER TABLE "documents" 
      ALTER COLUMN "fileUrl" DROP DEFAULT,
      ALTER COLUMN "category" DROP DEFAULT,
      ALTER COLUMN "uploadedByName" DROP DEFAULT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove new columns
    await queryRunner.query(`
      ALTER TABLE "documents" 
      DROP COLUMN IF EXISTS "uploadedByName"
    `);

    await queryRunner.query(`
      ALTER TABLE "documents" 
      DROP COLUMN IF EXISTS "subcategory"
    `);

    await queryRunner.query(`
      ALTER TABLE "documents" 
      DROP COLUMN IF EXISTS "category"
    `);

    await queryRunner.query(`
      ALTER TABLE "documents" 
      DROP COLUMN IF EXISTS "fileUrl"
    `);

    // Restore documentType as NOT NULL
    await queryRunner.query(`
      ALTER TABLE "documents" 
      ALTER COLUMN "documentType" SET NOT NULL
    `);
  }
}
