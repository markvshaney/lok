import fs from 'fs';
import path from 'path';

function verifyLastSession() {
  try {
    const date = new Date();
    const month = date.toISOString().slice(0, 7); // YYYY-MM
    const chatDir = path.join('.cursor-chats', month);
    const composerDir = path.join('.cursor-composer', month);
    
    // Get most recent files
    const chatFiles = fs.readdirSync(chatDir).sort().reverse();
    const composerFiles = fs.readdirSync(composerDir).sort().reverse();
    
    console.log('\n📚 Most Recent Sessions:');
    
    if (chatFiles.length > 0) {
      const lastChat = fs.readFileSync(path.join(chatDir, chatFiles[0]), 'utf8');
      console.log('\n🗣 Last Chat Session:', chatFiles[0]);
      console.log('Files Modified:', extractFilesFromSession(lastChat).length);
    }
    
    if (composerFiles.length > 0) {
      const lastComposer = fs.readFileSync(path.join(composerDir, composerFiles[0]), 'utf8');
      console.log('\n💻 Last Composer Session:', composerFiles[0]);
      console.log('Files Modified:', extractFilesFromSession(lastComposer).length);
    }
  } catch (error) {
    console.error('❌ Error verifying sessions:', error);
  }
}

// Add to package.json scripts 