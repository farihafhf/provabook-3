import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_profiles table
    await queryRunner.query(`
      CREATE TABLE "user_profiles" (
        "id" uuid NOT NULL,
        "email" character varying NOT NULL,
        "fullName" character varying NOT NULL,
        "role" character varying NOT NULL DEFAULT 'merchandiser',
        "phone" character varying,
        "department" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_profiles_email" UNIQUE ("email"),
        CONSTRAINT "PK_user_profiles" PRIMARY KEY ("id")
      )
    `);

    // Create orders table
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orderNumber" character varying NOT NULL,
        "customerName" character varying NOT NULL,
        "buyerName" character varying,
        "fabricType" character varying NOT NULL,
        "fabricSpecifications" text,
        "quantity" numeric(10,2) NOT NULL,
        "unit" character varying NOT NULL DEFAULT 'meters',
        "colorways" text,
        "status" character varying NOT NULL DEFAULT 'upcoming',
        "category" character varying NOT NULL DEFAULT 'upcoming',
        "orderDate" date,
        "expectedDeliveryDate" date,
        "actualDeliveryDate" date,
        "notes" text,
        "metadata" jsonb,
        "merchandiser_id" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_orders_orderNumber" UNIQUE ("orderNumber"),
        CONSTRAINT "PK_orders" PRIMARY KEY ("id")
      )
    `);

    // Create samples table
    await queryRunner.query(`
      CREATE TABLE "samples" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" character varying NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "status" character varying NOT NULL DEFAULT 'pending',
        "submissionDate" date,
        "receiptDate" date,
        "recipient" character varying,
        "courierName" character varying,
        "awbNumber" character varying,
        "rejectionReason" text,
        "responsiblePerson" character varying,
        "resubmissionTargetDate" date,
        "resubmissionPlanSet" boolean NOT NULL DEFAULT false,
        "notes" text,
        "metadata" jsonb,
        "order_id" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_samples" PRIMARY KEY ("id")
      )
    `);

    // Create proforma_invoices table
    await queryRunner.query(`
      CREATE TABLE "proforma_invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "piNumber" character varying NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "status" character varying NOT NULL DEFAULT 'draft',
        "amount" numeric(12,2) NOT NULL,
        "currency" character varying NOT NULL DEFAULT 'USD',
        "issueDate" date,
        "sentDate" date,
        "confirmedDate" date,
        "terms" text,
        "notes" text,
        "documentUrl" character varying,
        "metadata" jsonb,
        "order_id" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_proforma_invoices_piNumber" UNIQUE ("piNumber"),
        CONSTRAINT "PK_proforma_invoices" PRIMARY KEY ("id")
      )
    `);

    // Create letters_of_credit table
    await queryRunner.query(`
      CREATE TABLE "letters_of_credit" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "lcNumber" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "amount" numeric(12,2) NOT NULL,
        "currency" character varying NOT NULL DEFAULT 'USD',
        "issueDate" date NOT NULL,
        "expiryDate" date NOT NULL,
        "receiptDate" date,
        "issuingBank" character varying,
        "advisingBank" character varying,
        "terms" text,
        "notes" text,
        "documentUrl" character varying,
        "metadata" jsonb,
        "order_id" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_letters_of_credit_lcNumber" UNIQUE ("lcNumber"),
        CONSTRAINT "PK_letters_of_credit" PRIMARY KEY ("id")
      )
    `);

    // Create production_metrics table
    await queryRunner.query(`
      CREATE TABLE "production_metrics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orderId" uuid NOT NULL,
        "productionDate" date NOT NULL,
        "quantityProduced" numeric(10,2) NOT NULL,
        "unit" character varying NOT NULL DEFAULT 'meters',
        "machineNumber" character varying,
        "shift" character varying,
        "operator" character varying,
        "qualityNotes" text,
        "hasIssues" boolean NOT NULL DEFAULT false,
        "issues" text,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_production_metrics" PRIMARY KEY ("id")
      )
    `);

    // Create incidents table
    await queryRunner.query(`
      CREATE TABLE "incidents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text NOT NULL,
        "type" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'open',
        "severity" character varying NOT NULL DEFAULT 'medium',
        "incidentDate" date NOT NULL,
        "cause" text,
        "actionPlan" text,
        "responsiblePerson" character varying,
        "targetResolutionDate" date,
        "actualResolutionDate" date,
        "resolution" text,
        "metadata" jsonb,
        "order_id" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_incidents" PRIMARY KEY ("id")
      )
    `);

    // Create shipments table
    await queryRunner.query(`
      CREATE TABLE "shipments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "shipmentNumber" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "mode" character varying NOT NULL DEFAULT 'sea',
        "awbNumber" character varying,
        "courierName" character varying,
        "quantity" numeric(10,2) NOT NULL,
        "unit" character varying NOT NULL DEFAULT 'meters',
        "estimatedDepartureDate" date,
        "actualDepartureDate" date,
        "estimatedArrivalDate" date,
        "actualArrivalDate" date,
        "packingListUrl" character varying,
        "invoiceUrl" character varying,
        "notes" text,
        "metadata" jsonb,
        "order_id" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_shipments_shipmentNumber" UNIQUE ("shipmentNumber"),
        CONSTRAINT "PK_shipments" PRIMARY KEY ("id")
      )
    `);

    // Create documents table
    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "fileName" character varying NOT NULL,
        "fileType" character varying NOT NULL,
        "fileSize" integer NOT NULL,
        "storagePath" character varying NOT NULL,
        "documentType" character varying,
        "description" text,
        "uploadedBy" uuid NOT NULL,
        "metadata" jsonb,
        "order_id" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_documents" PRIMARY KEY ("id")
      )
    `);

    // Create notifications table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" character varying NOT NULL,
        "priority" character varying NOT NULL DEFAULT 'medium',
        "title" character varying NOT NULL,
        "message" text NOT NULL,
        "isRead" boolean NOT NULL DEFAULT false,
        "readAt" TIMESTAMP,
        "relatedEntityType" character varying,
        "relatedEntityId" uuid,
        "metadata" jsonb,
        "user_id" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);

    // Create audit_logs table
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "userEmail" character varying NOT NULL,
        "action" character varying NOT NULL,
        "entityType" character varying NOT NULL,
        "entityId" uuid,
        "oldValues" jsonb,
        "newValues" jsonb,
        "ipAddress" character varying,
        "userAgent" character varying,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    // Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_merchandiser"
      FOREIGN KEY ("merchandiser_id") REFERENCES "user_profiles"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "samples" ADD CONSTRAINT "FK_samples_order"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "proforma_invoices" ADD CONSTRAINT "FK_proforma_invoices_order"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "letters_of_credit" ADD CONSTRAINT "FK_letters_of_credit_order"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "incidents" ADD CONSTRAINT "FK_incidents_order"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "shipments" ADD CONSTRAINT "FK_shipments_order"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "documents" ADD CONSTRAINT "FK_documents_order"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user"
      FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_orders_status" ON "orders" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_category" ON "orders" ("category")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_merchandiser" ON "orders" ("merchandiser_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_samples_order" ON "samples" ("order_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_samples_status" ON "samples" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_user" ON "notifications" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_isRead" ON "notifications" ("isRead")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_userId" ON "audit_logs" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_entityType" ON "audit_logs" ("entityType")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_documents_order"`);
    await queryRunner.query(`ALTER TABLE "shipments" DROP CONSTRAINT "FK_shipments_order"`);
    await queryRunner.query(`ALTER TABLE "incidents" DROP CONSTRAINT "FK_incidents_order"`);
    await queryRunner.query(`ALTER TABLE "letters_of_credit" DROP CONSTRAINT "FK_letters_of_credit_order"`);
    await queryRunner.query(`ALTER TABLE "proforma_invoices" DROP CONSTRAINT "FK_proforma_invoices_order"`);
    await queryRunner.query(`ALTER TABLE "samples" DROP CONSTRAINT "FK_samples_order"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_merchandiser"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TABLE "shipments"`);
    await queryRunner.query(`DROP TABLE "incidents"`);
    await queryRunner.query(`DROP TABLE "production_metrics"`);
    await queryRunner.query(`DROP TABLE "letters_of_credit"`);
    await queryRunner.query(`DROP TABLE "proforma_invoices"`);
    await queryRunner.query(`DROP TABLE "samples"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TABLE "user_profiles"`);
  }
}
