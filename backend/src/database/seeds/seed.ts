import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { AppDataSource } from '../data-source';
import { UserProfile } from '../entities/user-profile.entity';
import { UserRole } from '../../common/enums/user-role.enum';

config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seed() {
  try {
    console.log('🌱 Starting seed process...');

    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const userProfileRepo = AppDataSource.getRepository(UserProfile);

    // Create demo users in Supabase Auth
    const demoUsers = [
      {
        email: 'admin@provabook.com',
        password: 'Admin@123',
        fullName: 'System Administrator',
        role: UserRole.ADMIN,
        department: 'IT',
        phone: '+1234567890',
      },
      {
        email: 'manager@provabook.com',
        password: 'Manager@123',
        fullName: 'John Manager',
        role: UserRole.MANAGER,
        department: 'Operations',
        phone: '+1234567891',
      },
      {
        email: 'merchandiser@provabook.com',
        password: 'Merchandiser@123',
        fullName: 'Sarah Merchandiser',
        role: UserRole.MERCHANDISER,
        department: 'Sales',
        phone: '+1234567892',
      },
      {
        email: 'qa@provabook.com',
        password: 'QA@123',
        fullName: 'Mike QA',
        role: UserRole.QA,
        department: 'Quality Assurance',
        phone: '+1234567893',
      },
    ];

    for (const userData of demoUsers) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const userExists = existingUser?.users?.find((u: any) => u.email === userData.email);

        let userId: string;

        if (userExists) {
          console.log(`ℹ️  User ${userData.email} already exists in Supabase Auth`);
          userId = userExists.id;
        } else {
          // Create user in Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true,
            user_metadata: {
              full_name: userData.fullName,
              role: userData.role,
            },
          });

          if (authError) {
            console.error(`❌ Error creating user ${userData.email}:`, authError.message);
            continue;
          }

          userId = authData.user.id;
          console.log(`✅ Created Supabase Auth user: ${userData.email}`);
        }

        // Check if profile exists
        const existingProfile = await userProfileRepo.findOne({ where: { id: userId } });

        if (existingProfile) {
          console.log(`ℹ️  Profile for ${userData.email} already exists`);
        } else {
          // Create user profile in database
          const profile = userProfileRepo.create({
            id: userId,
            email: userData.email,
            fullName: userData.fullName,
            role: userData.role,
            department: userData.department,
            phone: userData.phone,
            isActive: true,
          });

          await userProfileRepo.save(profile);
          console.log(`✅ Created user profile: ${userData.email}`);
        }
      } catch (error) {
        console.error(`❌ Error processing user ${userData.email}:`, error);
      }
    }

    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📝 Demo Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Administrator:');
    console.log('  Email: admin@provabook.com');
    console.log('  Password: Admin@123');
    console.log('\nManager:');
    console.log('  Email: manager@provabook.com');
    console.log('  Password: Manager@123');
    console.log('\nMerchandiser:');
    console.log('  Email: merchandiser@provabook.com');
    console.log('  Password: Merchandiser@123');
    console.log('\nQA:');
    console.log('  Email: qa@provabook.com');
    console.log('  Password: QA@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

seed();
