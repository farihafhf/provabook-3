import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNewOrderFields1734690000000 implements MigrationInterface {
  name = 'AddNewOrderFields1734690000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new order fields
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "styleNumber" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "fabricComposition" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "gsm" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "finishType" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "construction" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "millName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "millPrice" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "provaPrice" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "currency" character varying NOT NULL DEFAULT 'USD'`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "colorQuantityBreakdown" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "etd" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "eta" date`,
    );

    // Update existing approvalStatus to use new approval types
    // This safely migrates old data to new structure
    await queryRunner.query(`
      UPDATE "orders" 
      SET "approvalStatus" = jsonb_build_object(
        'labDip', COALESCE("approvalStatus"->>'labDip', 'pending'),
        'strikeOff', 'pending',
        'qualityTest', COALESCE("approvalStatus"->>'fabricTest', COALESCE("approvalStatus"->>'trimsCard', 'pending')),
        'bulkSwatch', 'pending',
        'ppSample', COALESCE("approvalStatus"->>'ppSample', 'pending')
      )
      WHERE "approvalStatus" IS NOT NULL 
      AND ("approvalStatus"::text != '{}' OR "approvalStatus"->>'strikeOff' IS NULL)
    `);

    // Set default approval status for orders without one
    await queryRunner.query(`
      UPDATE "orders" 
      SET "approvalStatus" = '{
        "labDip": "pending",
        "strikeOff": "pending",
        "qualityTest": "pending",
        "bulkSwatch": "pending",
        "ppSample": "pending"
      }'::jsonb
      WHERE "approvalStatus" IS NULL OR "approvalStatus"::text = '{}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert approval status changes
    await queryRunner.query(`
      UPDATE "orders" 
      SET "approvalStatus" = jsonb_build_object(
        'labDip', COALESCE("approvalStatus"->>'labDip', 'pending'),
        'trimsCard', 'pending',
        'fabricTest', COALESCE("approvalStatus"->>'qualityTest', 'pending'),
        'fitSample', 'pending',
        'ppSample', COALESCE("approvalStatus"->>'ppSample', 'pending')
      )
      WHERE "approvalStatus" IS NOT NULL
    `);

    // Remove new columns (only if they exist)
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "eta"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "etd"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "colorQuantityBreakdown"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "currency"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "provaPrice"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "millPrice"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "millName"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "construction"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "finishType"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "gsm"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "fabricComposition"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "styleNumber"`);
  }
}
