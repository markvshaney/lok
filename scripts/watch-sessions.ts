import chokidar from 'chokidar';
import fs from 'fs';
import { captureSession, extractFilesFromSession } from './session-capture';
import readline from 'readline';
import { execSync } from 'child_process';

let isShuttingDown = false;

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Manual save trigger
async function saveCurrentSession() {
  try {
    const scratchpadPath = '.cursor-scratchpad/current-session.md';
    if (fs.existsSync(scratchpadPath)) {
      const content = fs.readFileSync(scratchpadPath, 'utf8');
      const files = extractFilesFromSession(content);
      await captureSession('chat', content, files);
      console.log('✅ Manually saved current session');
    }
  } catch (error) {
    console.error('❌ Error saving current session:', error);
  }
}

// Watch for changes
const watcher = chokidar.watch([
  '.cursor-scratchpad/**/*',
  '.cursor-temp/**/*'
], {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 1000,
    pollInterval: 100
  }
});

watcher.on('change', async (path) => {
  if (isShuttingDown) return;
  
  try {
    const content = fs.readFileSync(path, 'utf8');
    const type = path.includes('chat') ? 'chat' : 'composer';
    const files = extractFilesFromSession(content);
    
    const result = await captureSession(type, content, files);
    if (result.success) {
      console.log(`✅ Captured ${type} session with ${files.length} files`);
      console.log(`📝 Saved to: ${result.fileName}`);
    } else {
      console.error(`❌ Failed to capture session: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ Error capturing session:', error);
  }
});

// Check for unaccepted composer changes
async function checkUnacceptedChanges(): Promise<boolean> {
  try {
    const composerPath = '.cursor-temp/composer.md';
    if (fs.existsSync(composerPath)) {
      const content = fs.readFileSync(composerPath, 'utf8');
      
      if (content.includes('<assistant_edit>') || content.includes('<edits_to_file>')) {
        return new Promise((resolve) => {
          console.log('\n📝 Composer has pending changes:');
          console.log('1. Review changes in composer window');
          console.log('2. Accept or reject each change');
          rl.question('\n⚠️ Would you like to review changes before closing? (y/n): ', (answer) => {
            if (answer.toLowerCase() === 'y') {
              console.log('\nPlease handle changes in composer, then press Ctrl+C again to close');
            }
            resolve(answer.toLowerCase() === 'y');
          });
        });
      }
    }
    return false;
  } catch (error) {
    console.error('❌ Error checking composer changes:', error);
    return false;
  }
}

// Git status check
async function checkGitStatus(): Promise<boolean> {
  try {
    const status = execSync('git status --porcelain').toString();
    if (status) {
      console.log('\n📦 Uncommitted changes detected:');
      console.log(status);
      return new Promise((resolve) => {
        rl.question('\n⚠️ Commit changes before closing? (y/n): ', async (answer) => {
          if (answer.toLowerCase() === 'y') {
            const message = await new Promise<string>((resolve) => {
              rl.question('Commit message: ', resolve);
            });
            execSync('git add .');
            execSync(`git commit -m "${message}"`);
            console.log('✅ Changes committed');
          }
          resolve(false);
        });
      });
    }
    return false;
  } catch (error) {
    console.error('❌ Error checking git status:', error);
    return false;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Preparing to shut down...');
  isShuttingDown = true;

  // Check for unaccepted changes
  const hasUnacceptedChanges = await checkUnacceptedChanges();
  if (hasUnacceptedChanges) {
    isShuttingDown = false;
    return;
  }

  // Check git status
  await checkGitStatus();
  
  // Final shutdown
  await saveCurrentSession();
  await watcher.close();
  rl.close();
  console.log('👋 Session capture stopped safely');
  process.exit(0);
});

// Manual save command
process.stdin.on('data', async (data) => {
  const command = data.toString().trim();
  if (command === 'save') {
    await saveCurrentSession();
  }
});

console.log(`
🔍 Watching for Cursor sessions...
Commands:
- Type 'save' to manually save current session
- Press Ctrl+C to safely stop watching
`); 