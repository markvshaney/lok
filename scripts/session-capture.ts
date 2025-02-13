import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar'; // We'll need to install this

interface SessionData {
  type: 'chat' | 'composer';
  content: string;
  files: string[];
  timestamp: Date;
}

interface SessionResult {
  success: boolean;
  fileName?: string;
  error?: string;
}

const captureSession = async (
  type: SessionData['type'], 
  content: string, 
  files: string[]
): Promise<SessionResult> => {
  try {
    const date = format(new Date(), 'yyyy-MM-dd');
    const month = format(new Date(), 'yyyy-MM');
    const baseDir = type === 'chat' ? '.cursor-chats' : '.cursor-composer';
    const monthDir = path.join(baseDir, month);

    // Ensure directories exist
    if (!fs.existsSync(monthDir)) {
      fs.mkdirSync(monthDir, { recursive: true });
    }

    // Create session file
    const fileName = `${date}-${type}-session-${format(new Date(), 'HHmmss')}.md`;
    const filePath = path.join(monthDir, fileName);

    const sessionContent = `# ${type.toUpperCase()} Session - ${date}

## Files Modified
${files.map(f => `- ${f}`).join('\n')}

## Content
${content}
`;

    await fs.promises.writeFile(filePath, sessionContent);
    await updateIndex(type, fileName, files);

    return { success: true, fileName };
  } catch (error) {
    console.error('Error capturing session:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

const updateIndex = (type: 'chat' | 'composer', fileName: string, files: string[]) => {
  const indexPath = path.join(type === 'chat' ? '.cursor-chats' : '.cursor-composer', 'README.md');
  const date = format(new Date(), 'yyyy-MM-dd');
  
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  const newEntry = `- [${date}] [Session](${fileName}) - Files: ${files.join(', ')}\n`;
  
  indexContent = indexContent.replace('## Session Index\n', `## Session Index\n${newEntry}`);
  fs.writeFileSync(indexPath, indexContent);
};

function extractFilesFromSession(content: string): string[] {
  const files = new Set<string>();
  
  // Match file paths in markdown code blocks
  const codeBlockRegex = /```[\w-]+:([^\n]+)/g;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match[1]) {
      files.add(match[1].trim());
    }
  }
  
  // Match file paths in open_file tags
  const openFileRegex = /<open_file>([\s\S]*?)<\/open_file>/g;
  const filePathRegex = /```[\w-]*:([^\n]+)/;
  
  while ((match = openFileRegex.exec(content)) !== null) {
    const fileMatch = match[1].match(filePathRegex);
    if (fileMatch && fileMatch[1]) {
      files.add(fileMatch[1].trim());
    }
  }
  
  return Array.from(files);
}

export { captureSession, extractFilesFromSession }; 