import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateOrderFieldsAndApprovals1734680000000
  implements MigrationInterface
{
  name = 'UpdateOrderFieldsAndApprovals1734680000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new order fields
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "styleNumber" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "fabricComposition" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "gsm" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "finishType" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "construction" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "millName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "millPrice" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "provaPrice" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "currency" character varying NOT NULL DEFAULT 'USD'`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "colorQuantityBreakdown" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "etd" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "eta" date`,
    );

    // Update existing approvalStatus to remove old fields and add new ones
    // This migration will preserve existing labDip and fabricTest (renamed to qualityTest)
    await queryRunner.query(`
      UPDATE "orders" 
      SET "approvalStatus" = jsonb_build_object(
        'labDip', COALESCE("approvalStatus"->>'labDip', 'pending'),
        'strikeOff', 'pending',
        'qualityTest', COALESCE("approvalStatus"->>'fabricTest', 'pending'),
        'bulkSwatch', 'pending',
        'ppSample', COALESCE("approvalStatus"->>'ppSample', 'pending')
      )
      WHERE "approvalStatus" IS NOT NULL
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

    // Remove new columns
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "eta"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "etd"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "colorQuantityBreakdown"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "currency"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "provaPrice"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "millPrice"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "millName"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "construction"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "finishType"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "gsm"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "fabricComposition"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "styleNumber"`);
  }
}
