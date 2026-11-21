/**
 * Migration Script: Fix missing questions and postType for old shared posts.
 * Especially targets posts created by user with mobile number 9840396886.
 *
 * Usage:
 *   node scripts/fix-shared-posts.js              # Runs in live mode for mobile 9840396886 & all shared posts
 *   node scripts/fix-shared-posts.js --dry-run    # Preview changes without modifying the database
 *   node scripts/fix-shared-posts.js --phone <no> # Target a custom phone number (default: 9840396886)
 *   node scripts/fix-shared-posts.js --user-only  # Only update posts by the specified user
 *   node scripts/fix-shared-posts.js --shares-only # Only update posts with sharedPostId != null
 *   node scripts/fix-shared-posts.js --force-question # Re-generate question even if already set
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../src/config/database');
const User = require('../src/models/User.model');
const Post = require('../src/models/Post.model');
const { generateAiQuestion } = require('../src/services/ai.service');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isUserOnly = args.includes('--user-only');
const isSharesOnly = args.includes('--shares-only');
const isForceQuestion = args.includes('--force-question');

let targetPhone = '9840396886';
const phoneArgIndex = args.indexOf('--phone');
if (phoneArgIndex !== -1 && args[phoneArgIndex + 1]) {
  targetPhone = args[phoneArgIndex + 1].trim();
}

/**
 * Clean and normalize a question string:
 * - strips surrounding quotes and "Question: " prefix
 * - ensures it ends with a question mark
 */
function cleanQuestionString(str) {
  if (!str || typeof str !== 'string') return '';
  let clean = str.trim()
    .replace(/^["'`\s]+|["'`\s]+$/g, '')
    .replace(/^Question:\s*/i, '')
    .trim();
  if (clean && !clean.endsWith('?')) {
    clean = clean.replace(/[.!]+$/, '') + '?';
  }
  return clean;
}

/**
 * Intelligent question generator for shared posts:
 * 1. Post content -> OpenAI
 * 2. Original post question / title
 * 3. Original post content -> OpenAI
 * 4. Link preview title / description
 * 5. Smart fallback heuristics
 */
async function determineQuestionForPost(post, originalPost) {
  const postContent = (post.content || '').trim();
  const origQuestion = (originalPost?.question || originalPost?.title || '').trim();
  const origContent = (originalPost?.content || '').trim();
  const linkTitle = (post.linkPreview?.title || originalPost?.linkPreview?.title || '').trim();
  const linkDesc = (post.linkPreview?.description || originalPost?.linkPreview?.description || '').trim();

  // 1. If post has its own text, generate question for the shared content
  if (postContent) {
    try {
      const generated = await generateAiQuestion(postContent, 'share', { postType: 'share' });
      const cleaned = cleanQuestionString(generated);
      if (cleaned) return cleaned;
    } catch (err) {
      console.warn(`    ⚠️ AI question generation from post content failed: ${err.message}`);
    }
  }

  // 2. If the original post already has a question or title, adopt it
  if (origQuestion) {
    const cleaned = cleanQuestionString(origQuestion);
    if (cleaned) return cleaned;
  }

  // 3. If original post has content, generate question from the original content
  if (origContent) {
    try {
      const generated = await generateAiQuestion(origContent, 'share', { postType: 'share' });
      const cleaned = cleanQuestionString(generated);
      if (cleaned) return cleaned;
    } catch (err) {
      console.warn(`    ⚠️ AI question generation from original post content failed: ${err.message}`);
    }
  }

  // 4. If link preview is present, formulate question from title
  if (linkTitle) {
    try {
      const generated = await generateAiQuestion(linkTitle, 'share', { postType: 'share' });
      const cleaned = cleanQuestionString(generated);
      if (cleaned) return cleaned;
    } catch (e) {}
    return cleanQuestionString(`What are your thoughts on "${linkTitle}"?`);
  }

  // 5. Fallback heuristics if AI was unavailable or content was short
  const sourceText = postContent || origContent || linkDesc;
  if (sourceText) {
    const firstLine = sourceText.split('\n')[0].trim();
    if (firstLine.includes('?')) {
      const match = firstLine.match(/[^.!?]*\?/);
      if (match) return cleanQuestionString(match[0]);
    }
    const truncated = firstLine.replace(/[.!]+$/, '').slice(0, 100).trim();
    if (truncated.split(/\s+/).length <= 4) {
      return cleanQuestionString(`What are your perspectives on ${truncated}?`);
    }
    return cleanQuestionString(`${truncated}?`);
  }

  // 6. Final friendly community fallback
  return 'What are your thoughts on this shared post?';
}

/**
 * Main migration function
 */
async function run() {
  console.log('='.repeat(70));
  console.log(' Connect.in - Shared Posts Question & Type Migration Script');
  console.log('='.repeat(70));
  console.log(` Mode:           ${isDryRun ? '🔍 DRY RUN (No changes will be saved)' : '🚀 LIVE (Changes will be written to MongoDB)'}`);
  console.log(` Target Phone:   ${targetPhone}`);
  console.log(` Scope:          ${isUserOnly ? 'User-only' : isSharesOnly ? 'Shares-only' : 'User + All Shared Posts'}`);
  console.log(` Force Question: ${isForceQuestion ? 'Yes' : 'No'}`);
  console.log('='.repeat(70));

  try {
    await connectDB();
    console.log('\n[1/3] Connected to MongoDB database successfully.\n');

    let totalUpdated = 0;
    let totalSkipped = 0;
    const processedPostIds = new Set();

    // -------------------------------------------------------------
    // PHASE 1: Target posts done by the specified mobile number
    // -------------------------------------------------------------
    if (!isSharesOnly) {
      console.log(`[2/3] Searching for user with phone matching "${targetPhone}"...`);

      // Match phone numbers with optional country code / formatting
      const cleanDigits = targetPhone.replace(/\D/g, '');
      const userQuery = {
        phoneNumber: { $regex: cleanDigits }
      };

      const matchedUsers = await User.find(userQuery).populate('userDetailId').lean();

      if (matchedUsers.length === 0) {
        console.warn(`  ⚠️ No user found in User collection matching phone digits "${cleanDigits}".`);
      } else {
        console.log(`  ✓ Found ${matchedUsers.length} user record(s):`);
        for (const u of matchedUsers) {
          const name = u.userDetailId?.fullName || u.userDetailId?.businessName || 'N/A';
          console.log(`    - ID: ${u._id} | Phone: ${u.phoneNumber} | Name: ${name}`);
        }

        const userIds = matchedUsers.map(u => u._id);
        const userPosts = await Post.find({ userId: { $in: userIds } })
          .populate('sharedPostId')
          .sort({ createdAt: -1 });

        console.log(`\n  Found ${userPosts.length} total post(s) created by phone ${targetPhone}:`);

        for (const post of userPosts) {
          processedPostIds.add(post._id.toString());
          const originalPost = post.sharedPostId;
          const currentQuestion = (post.question || post.title || '').trim();
          const currentPostType = post.postType;
          const currentTSPostType = post.targetSegments?.postType;

          const needsQuestion = !currentQuestion || isForceQuestion;
          const needsPostType = currentPostType !== 'share' || currentTSPostType !== 'share';

          if (!needsQuestion && !needsPostType) {
            console.log(`  ✓ [Post ${post._id}] Already up to date (Question: "${currentQuestion}" | postType: "${currentPostType}"). Skipping.`);
            totalSkipped++;
            continue;
          }

          const newQuestion = needsQuestion
            ? await determineQuestionForPost(post, originalPost)
            : currentQuestion;

          console.log(`  -> [Post ${post._id}]`);
          console.log(`     Content preview:  "${(post.content || '').slice(0, 60).replace(/\n/g, ' ')}${(post.content || '').length > 60 ? '...' : ''}"`);
          console.log(`     Is Shared Post:   ${post.sharedPostId ? 'Yes' : 'No'}`);
          console.log(`     Previous:         postType="${currentPostType}" | question="${currentQuestion || '(EMPTY)'}"`);
          console.log(`     Updating to:      postType="share" | question="${newQuestion}"`);

          if (!isDryRun) {
            const updateFields = {
              postType: 'share',
              'targetSegments.postType': 'share',
              question: newQuestion,
              title: newQuestion
            };

            // If targetSegments is missing, initialize it
            if (!post.targetSegments) {
              updateFields.targetSegments = {
                postType: 'share',
                getAiResponses: true,
                audienceType: 'connections',
                connections: true,
                city: false,
                industries: [],
                interests: [],
                ageGroups: []
              };
            }

            await Post.findByIdAndUpdate(
              post._id,
              { $set: updateFields },
              { new: true, runValidators: false }
            );
            console.log('     Status:           ✅ Successfully updated in DB.');
          } else {
            console.log('     Status:           🔍 [DRY RUN] Would be updated.');
          }

          totalUpdated++;
          // Small pause to be gentle with rate limits if calling OpenAI
          await new Promise(r => setTimeout(r, 150));
        }
      }
    }

    // -------------------------------------------------------------
    // PHASE 2: Target all other shared posts across the database
    // -------------------------------------------------------------
    if (!isUserOnly) {
      console.log('\n[3/3] Checking all other shared posts across production database...');

      const sharedPostsQuery = {
        _id: { $nin: Array.from(processedPostIds).map(id => new mongoose.Types.ObjectId(id)) },
        $or: [
          { sharedPostId: { $ne: null } },
          { postType: 'share' },
          { 'targetSegments.postType': 'share' }
        ]
      };

      const sharedPosts = await Post.find(sharedPostsQuery)
        .populate({
          path: 'userId',
          select: 'phoneNumber'
        })
        .populate('sharedPostId')
        .sort({ createdAt: -1 });

      console.log(`  Found ${sharedPosts.length} additional shared post(s) across other users:`);

      for (const post of sharedPosts) {
        processedPostIds.add(post._id.toString());
        const originalPost = post.sharedPostId;
        const currentQuestion = (post.question || post.title || '').trim();
        const currentPostType = post.postType;
        const currentTSPostType = post.targetSegments?.postType;

        const needsQuestion = !currentQuestion || isForceQuestion;
        const needsPostType = currentPostType !== 'share' || currentTSPostType !== 'share';

        if (!needsQuestion && !needsPostType) {
          console.log(`  ✓ [Post ${post._id}] Already up to date (Question: "${currentQuestion}" | postType: "${currentPostType}"). Skipping.`);
          totalSkipped++;
          continue;
        }

        const newQuestion = needsQuestion
          ? await determineQuestionForPost(post, originalPost)
          : currentQuestion;

        const authorPhone = post.userId?.phoneNumber || 'Unknown';
        console.log(`  -> [Post ${post._id}] (Author phone: ${authorPhone})`);
        console.log(`     Content preview:  "${(post.content || '').slice(0, 60).replace(/\n/g, ' ')}${(post.content || '').length > 60 ? '...' : ''}"`);
        console.log(`     Is Shared Post:   ${post.sharedPostId ? 'Yes' : 'No'}`);
        console.log(`     Previous:         postType="${currentPostType}" | question="${currentQuestion || '(EMPTY)'}"`);
        console.log(`     Updating to:      postType="share" | question="${newQuestion}"`);

        if (!isDryRun) {
          const updateFields = {
            postType: 'share',
            'targetSegments.postType': 'share',
            question: newQuestion,
            title: newQuestion
          };

          if (!post.targetSegments) {
            updateFields.targetSegments = {
              postType: 'share',
              getAiResponses: true,
              audienceType: 'connections',
              connections: true,
              city: false,
              industries: [],
              interests: [],
              ageGroups: []
            };
          }

          await Post.findByIdAndUpdate(
            post._id,
            { $set: updateFields },
            { new: true, runValidators: false }
          );
          console.log('     Status:           ✅ Successfully updated in DB.');
        } else {
          console.log('     Status:           🔍 [DRY RUN] Would be updated.');
        }

        totalUpdated++;
        await new Promise(r => setTimeout(r, 150));
      }
    }

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n' + '='.repeat(70));
    console.log(' MIGRATION SUMMARY');
    console.log('='.repeat(70));
    console.log(` Mode:                     ${isDryRun ? '🔍 DRY RUN' : '🚀 LIVE PRODUCTION'}`);
    console.log(` Total Posts Processed:    ${totalUpdated + totalSkipped}`);
    console.log(` Posts Updated:            ${totalUpdated}`);
    console.log(` Posts Already Up-To-Date: ${totalSkipped}`);
    if (isDryRun) {
      console.log('\n 💡 This was a dry run. To execute changes on your live database, run:');
      console.log('    node scripts/fix-shared-posts.js');
    } else {
      console.log('\n 🎉 Migration completed successfully! Changes are live in the database.');
    }
    console.log('='.repeat(70) + '\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Fatal Migration Error:', err);
    process.exit(1);
  }
}

run();
