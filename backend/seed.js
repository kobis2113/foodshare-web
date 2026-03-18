const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const uri = 'mongodb://admin:bartar20%40CS@localhost:21771/foodshare?authSource=admin';

// Download image helper with redirect support
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filepath = path.join(__dirname, 'uploads', filename);
    const file = fs.createWriteStream(filepath);

    const makeRequest = (reqUrl) => {
      const protocol = reqUrl.startsWith('https') ? https : http;
      protocol.get(reqUrl, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
          const redirectUrl = response.headers.location;
          makeRequest(redirectUrl);
        } else if (response.statusCode === 200) {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(filename);
          });
        } else {
          reject(new Error(`HTTP ${response.statusCode}`));
        }
      }).on('error', reject);
    };

    makeRequest(url);
  });
}

async function seed() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    const db = client.db('foodshare');

    // Clear existing data
    await db.collection('users').deleteMany({});
    await db.collection('posts').deleteMany({});
    await db.collection('comments').deleteMany({});
    console.log('🗑️  Cleared database');

    // Clear and recreate uploads directory
    const uploadsDir = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadsDir)) {
      // Remove all files in uploads folder
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        fs.unlinkSync(path.join(uploadsDir, file));
      }
      console.log('🗑️  Cleared uploads folder');
    } else {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Download user avatars
    console.log('📥 Downloading user avatars...');
    const avatarUrls = [
      'https://i.pravatar.cc/150?u=alice123',
      'https://i.pravatar.cc/150?u=bob456',
      'https://i.pravatar.cc/150?u=carol789',
      'https://i.pravatar.cc/150?u=david012',
      'https://i.pravatar.cc/150?u=emma345',
    ];

    const avatarFiles = [];
    for (let i = 0; i < avatarUrls.length; i++) {
      try {
        const filename = `avatar-${i + 1}.jpg`;
        await downloadImage(avatarUrls[i], filename);
        avatarFiles.push(`/uploads/${filename}`);
        console.log(`   ✓ Avatar ${i + 1}`);
      } catch (e) {
        avatarFiles.push(''); // Empty string for failed avatars (schema default)
        console.log(`   ✗ Avatar ${i + 1} failed: ${e.message}`);
      }
    }

    // Download food images from Unsplash (verified food images)
    console.log('📥 Downloading food images...');
    const foodImageUrls = [
      // Salmon dish
      'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80',
      // Avocado toast
      'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=600&q=80',
      // Buddha bowl / salad
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
      // Stir fry
      'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80',
      // Smoothie
      'https://images.unsplash.com/photo-1638176066666-ffb2f013c7dd?w=600&q=80',
      // Pasta
      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80',
      // Overnight oats
      'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=600&q=80',
    ];

    const foodFiles = [];
    for (let i = 0; i < foodImageUrls.length; i++) {
      try {
        const filename = `food-${i + 1}.jpg`;
        await downloadImage(foodImageUrls[i], filename);
        foodFiles.push(`/uploads/${filename}`);
        console.log(`   ✓ Food image ${i + 1}`);
      } catch (e) {
        // Create a simple placeholder file if download fails
        const filename = `food-${i + 1}.jpg`;
        const filepath = path.join(__dirname, 'uploads', filename);
        // Write a minimal valid JPEG (1x1 pixel orange)
        const minimalJpeg = Buffer.from([
          0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
          0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
          0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
          0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
          0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
          0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
          0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
          0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
          0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
          0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
          0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
          0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
          0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
          0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
          0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
          0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
          0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
          0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
          0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
          0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
          0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
          0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
          0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
          0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
          0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
          0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
          0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x20, 0xA8, 0xA2, 0x80, 0x0A,
          0xFF, 0xD9
        ]);
        fs.writeFileSync(filepath, minimalJpeg);
        foodFiles.push(`/uploads/${filename}`);
        console.log(`   ✗ Food image ${i + 1} failed, created placeholder`);
      }
    }

    // Create 5 users
    console.log('👥 Creating users...');
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const now = new Date();

    const users = [
      {
        email: 'alice@foodshare.com',
        displayName: 'Alice Johnson',
        password: passwordHash,
        profileImage: avatarFiles[0],
        authProvider: 'local',
        refreshTokens: [],
        createdAt: new Date(now - 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 30 * 24 * 60 * 60 * 1000)
      },
      {
        email: 'bob@foodshare.com',
        displayName: 'Bob Smith',
        password: passwordHash,
        profileImage: avatarFiles[1],
        authProvider: 'local',
        refreshTokens: [],
        createdAt: new Date(now - 25 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 25 * 24 * 60 * 60 * 1000)
      },
      {
        email: 'carol@foodshare.com',
        displayName: 'Carol Davis',
        password: passwordHash,
        profileImage: avatarFiles[2],
        authProvider: 'local',
        refreshTokens: [],
        createdAt: new Date(now - 20 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 20 * 24 * 60 * 60 * 1000)
      },
      {
        email: 'david@foodshare.com',
        displayName: 'David Wilson',
        password: passwordHash,
        profileImage: avatarFiles[3],
        authProvider: 'local',
        refreshTokens: [],
        createdAt: new Date(now - 15 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 15 * 24 * 60 * 60 * 1000)
      },
      {
        email: 'emma@foodshare.com',
        displayName: 'Emma Brown',
        password: passwordHash,
        profileImage: avatarFiles[4],
        authProvider: 'local',
        refreshTokens: [],
        createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 10 * 24 * 60 * 60 * 1000)
      },
    ];

    const insertedUsers = await db.collection('users').insertMany(users);
    const userIds = Object.values(insertedUsers.insertedIds);
    console.log('   ✓ Created 5 users');

    // Create 7 posts with CORRECT schema
    console.log('📝 Creating posts...');
    const posts = [
      // Alice - 1 post
      {
        author: userIds[0],
        mealName: 'Grilled Salmon with Lemon Herbs',
        description: 'Fresh Atlantic salmon grilled to perfection with rosemary, thyme, and a squeeze of lemon. High-protein dinner ready in 20 minutes!',
        image: foodFiles[0] || '/default-food.svg',
        likes: [userIds[1], userIds[2], userIds[3], userIds[4]],
        likesCount: 4,
        commentsCount: 3,
        nutrition: { calories: 350, protein: 40, carbs: 5, fat: 18, healthTips: ['High in omega-3', 'Great source of protein'] },
        createdAt: new Date(now - 6 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 6 * 24 * 60 * 60 * 1000)
      },
      // Bob - 1 post
      {
        author: userIds[1],
        mealName: 'Classic Avocado Toast',
        description: 'Crispy sourdough toast with smashed avocado, cherry tomatoes, and everything bagel seasoning. Breakfast champion!',
        image: foodFiles[1] || '/default-food.svg',
        likes: [userIds[0], userIds[2], userIds[4]],
        likesCount: 3,
        commentsCount: 2,
        nutrition: { calories: 280, protein: 8, carbs: 30, fat: 16, healthTips: ['Healthy fats', 'Good fiber source'] },
        createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 5 * 24 * 60 * 60 * 1000)
      },
      // Carol - 1 post
      {
        author: userIds[2],
        mealName: 'Rainbow Veggie Buddha Bowl',
        description: 'Colorful bowl with roasted chickpeas, quinoa, fresh greens, carrots, purple cabbage, and tahini dressing. Vegan and gluten-free!',
        image: foodFiles[2] || '/default-food.svg',
        likes: [userIds[0], userIds[1], userIds[3], userIds[4]],
        likesCount: 4,
        commentsCount: 2,
        nutrition: { calories: 420, protein: 15, carbs: 52, fat: 18, healthTips: ['Plant-based protein', 'Rich in vitamins'] },
        createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 4 * 24 * 60 * 60 * 1000)
      },
      // David - 2 posts
      {
        author: userIds[3],
        mealName: 'Quick Chicken Stir Fry',
        description: 'Family favorite! Tender chicken with bell peppers, broccoli, and snap peas in ginger-soy sauce. Ready in 15 minutes!',
        image: foodFiles[3] || '/default-food.svg',
        likes: [userIds[0], userIds[2]],
        likesCount: 2,
        commentsCount: 1,
        nutrition: { calories: 380, protein: 35, carbs: 20, fat: 14, healthTips: ['Lean protein', 'Lots of veggies'] },
        createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 3 * 24 * 60 * 60 * 1000)
      },
      {
        author: userIds[3],
        mealName: 'Kids-Approved Protein Smoothie',
        description: 'Even picky eaters love this! Banana, peanut butter, chocolate protein powder, and secret spinach. They never know its healthy!',
        image: foodFiles[4] || '/default-food.svg',
        likes: [userIds[0], userIds[1], userIds[2], userIds[4]],
        likesCount: 4,
        commentsCount: 2,
        nutrition: { calories: 320, protein: 28, carbs: 35, fat: 10, healthTips: ['Post-workout fuel', 'Hidden veggies'] },
        createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000)
      },
      // Emma - 2 posts
      {
        author: userIds[4],
        mealName: 'Mediterranean Pasta Primavera',
        description: 'Whole wheat penne with roasted zucchini, sun-dried tomatoes, olives, fresh basil, and garlic olive oil sauce.',
        image: foodFiles[5] || '/default-food.svg',
        likes: [userIds[1], userIds[2], userIds[3]],
        likesCount: 3,
        commentsCount: 1,
        nutrition: { calories: 420, protein: 14, carbs: 65, fat: 12, healthTips: ['Mediterranean diet', 'Whole grains'] },
        createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 1 * 24 * 60 * 60 * 1000)
      },
      {
        author: userIds[4],
        mealName: 'Berry Overnight Oats',
        description: 'Prep tonight, eat tomorrow! Oats soaked in almond milk with strawberries, blueberries, chia seeds, and maple syrup.',
        image: foodFiles[6] || '/default-food.svg',
        likes: [userIds[0], userIds[1], userIds[3]],
        likesCount: 3,
        commentsCount: 2,
        nutrition: { calories: 310, protein: 12, carbs: 52, fat: 8, healthTips: ['Meal prep friendly', 'High fiber'] },
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ];

    const insertedPosts = await db.collection('posts').insertMany(posts);
    const postIds = Object.values(insertedPosts.insertedIds);
    console.log('   ✓ Created 7 posts');

    // Create comments with CORRECT schema (post, author, text)
    console.log('💬 Creating comments...');
    const comments = [
      // Comments on Alice's salmon (3)
      { post: postIds[0], author: userIds[1], text: 'This looks incredible! What temperature do you grill at?', createdAt: new Date(now - 5.5 * 24 * 60 * 60 * 1000) },
      { post: postIds[0], author: userIds[2], text: 'I made this last night - absolutely delicious!', createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000) },
      { post: postIds[0], author: userIds[4], text: 'Perfect macros for a post-workout meal!', createdAt: new Date(now - 4.5 * 24 * 60 * 60 * 1000) },

      // Comments on Bob's avocado toast (2)
      { post: postIds[1], author: userIds[0], text: 'The everything bagel seasoning is a game changer!', createdAt: new Date(now - 4.5 * 24 * 60 * 60 * 1000) },
      { post: postIds[1], author: userIds[4], text: 'Pro tip: add a poached egg on top!', createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000) },

      // Comments on Carol's buddha bowl (2)
      { post: postIds[2], author: userIds[0], text: 'So colorful! How do you make the tahini dressing?', createdAt: new Date(now - 3.5 * 24 * 60 * 60 * 1000) },
      { post: postIds[2], author: userIds[3], text: 'My kids actually ate all the veggies! Thank you!', createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000) },

      // Comments on David's stir fry (1)
      { post: postIds[3], author: userIds[2], text: 'This would be great with tofu too!', createdAt: new Date(now - 2.5 * 24 * 60 * 60 * 1000) },

      // Comments on David's smoothie (2)
      { post: postIds[4], author: userIds[4], text: 'Sneaky spinach! I do the same with my clients!', createdAt: new Date(now - 1.5 * 24 * 60 * 60 * 1000) },
      { post: postIds[4], author: userIds[1], text: 'Adding this to my meal prep rotation!', createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000) },

      // Comments on Emma's pasta (1)
      { post: postIds[5], author: userIds[0], text: 'Mediterranean food is the best!', createdAt: new Date(now - 0.5 * 24 * 60 * 60 * 1000) },

      // Comments on Emma's oats (2)
      { post: postIds[6], author: userIds[1], text: 'Overnight oats saved my mornings!', createdAt: new Date(now - 2 * 60 * 60 * 1000) },
      { post: postIds[6], author: userIds[3], text: 'Do you have a peanut butter version?', createdAt: new Date(now - 1 * 60 * 60 * 1000) },
    ];

    await db.collection('comments').insertMany(comments);
    console.log('   ✓ Created 13 comments');

    console.log('\n🎉 ====== SEED COMPLETED SUCCESSFULLY! ======');
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('   ─────────────────────────────────────');
    console.log('   Password for all users: Password123!');
    console.log('   ─────────────────────────────────────');
    console.log('   📧 alice@foodshare.com (1 post)');
    console.log('   📧 bob@foodshare.com (1 post)');
    console.log('   📧 carol@foodshare.com (1 post)');
    console.log('   📧 david@foodshare.com (2 posts)');
    console.log('   📧 emma@foodshare.com (2 posts)');
    console.log('   ─────────────────────────────────────\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

seed();
