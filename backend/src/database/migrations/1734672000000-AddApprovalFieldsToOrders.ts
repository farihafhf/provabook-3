import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApprovalFieldsToOrders1734672000000 implements MigrationInterface {
  name = 'AddApprovalFieldsToOrders1734672000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add approvalStatus JSONB column
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "approvalStatus" jsonb DEFAULT '{}'`,
    );

    // Add currentStage column with default value
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "currentStage" character varying NOT NULL DEFAULT 'Design'`,
    );

    // Initialize approvalStatus for existing orders
    await queryRunner.query(
      `UPDATE "orders" SET "approvalStatus" = '{"labDip": "pending", "trimsCard": "pending", "fabricTest": "pending", "fitSample": "pending", "ppSample": "pending"}'::jsonb WHERE "approvalStatus" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove added columns
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "currentStage"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "approvalStatus"`);
  }
}
